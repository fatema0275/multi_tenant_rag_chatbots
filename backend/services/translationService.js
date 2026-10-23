'use strict';

/**
 * services/translationService.js
 * Multi-language identification and translation via Sarvam AI API.
 * Enables Cross-Lingual RAG:
 * 1. Detects non-English queries (Hindi, Gujarati, Tamil, Hinglish, etc.)
 * 2. Translates query to English for accurate semantic vector retrieval against website content
 * 3. Translates generated answers back to the user's native language
 */

const SARVAM_LID_URL = 'https://api.sarvam.ai/text-lid';
const SARVAM_TRANSLATE_URL = 'https://api.sarvam.ai/translate';

// Common Indian language codes supported by Sarvam AI
const SUPPORTED_SARVAM_LANGUAGES = new Set([
  'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'mr-IN',
  'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'od-IN',
  'as-IN', 'ur-IN', 'ne-IN'
]);

/**
 * Detect language of given text using Sarvam LID endpoint.
 *
 * @param {string} text
 * @returns {Promise<{languageCode: string, scriptCode: string, isNonEnglish: boolean}>}
 */
async function detectLanguage(text) {
  const sarvamApiKey = process.env.SARVAM_API_KEY;
  if (!sarvamApiKey || !sarvamApiKey.trim() || !text || typeof text !== 'string') {
    return { languageCode: 'en-IN', scriptCode: 'Latn', isNonEnglish: false };
  }

  const cleanText = text.trim();
  if (cleanText.length < 3) {
    return { languageCode: 'en-IN', scriptCode: 'Latn', isNonEnglish: false };
  }

  try {
    const res = await fetch(SARVAM_LID_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': sarvamApiKey.trim(),
      },
      body: JSON.stringify({ input: cleanText.slice(0, 1000) }),
    });

    if (!res.ok) {
      console.warn(`[Sarvam LID] Non-OK status ${res.status}`);
      return { languageCode: 'en-IN', scriptCode: 'Latn', isNonEnglish: false };
    }

    const data = await res.json();
    const languageCode = data.language_code || 'en-IN';
    const scriptCode = data.script_code || 'Latn';

    // It's non-English if the code is not en-IN
    const isNonEnglish = languageCode !== 'en-IN' && SUPPORTED_SARVAM_LANGUAGES.has(languageCode);

    return { languageCode, scriptCode, isNonEnglish };
  } catch (err) {
    console.warn('[Sarvam LID Error]:', err.message);
    return { languageCode: 'en-IN', scriptCode: 'Latn', isNonEnglish: false };
  }
}

/**
 * Translate text between languages using Sarvam Translate API.
 *
 * @param {Object} params
 * @param {string} params.input - Text to translate
 * @param {string} params.sourceLanguageCode - Source language code (e.g. 'hi-IN', 'en-IN')
 * @param {string} params.targetLanguageCode - Target language code (e.g. 'en-IN', 'hi-IN')
 * @param {string} [params.model] - 'sarvam-translate:v1' (default) or 'mayura:v1'
 * @returns {Promise<string>}
 */
async function translateText({ input, sourceLanguageCode, targetLanguageCode, model = 'sarvam-translate:v1' }) {
  const sarvamApiKey = process.env.SARVAM_API_KEY;
  if (!sarvamApiKey || !sarvamApiKey.trim() || !input || !input.trim()) {
    return input;
  }

  if (sourceLanguageCode === targetLanguageCode) {
    return input;
  }

  try {
    const res = await fetch(SARVAM_TRANSLATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': sarvamApiKey.trim(),
      },
      body: JSON.stringify({
        input: input.trim(),
        source_language_code: sourceLanguageCode,
        target_language_code: targetLanguageCode,
        model: model || 'sarvam-translate:v1',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Sarvam Translate] HTTP ${res.status}: ${errText}`);
      return input;
    }

    const data = await res.json();
    return data.translated_text || input;
  } catch (err) {
    console.warn('[Sarvam Translate Error]:', err.message);
    return input;
  }
}

/**
 * Process an incoming user query:
 * - Detects language
 * - If non-English Indian language, translates to English for semantic retrieval
 *
 * @param {string} query
 * @returns {Promise<{
 *   englishQuery: string,
 *   originalQuery: string,
 *   detectedLanguage: {languageCode: string, scriptCode: string, isNonEnglish: boolean}
 * }>}
 */
async function processIncomingQuery(query) {
  const detected = await detectLanguage(query);

  if (!detected.isNonEnglish) {
    return {
      englishQuery: query,
      originalQuery: query,
      detectedLanguage: detected,
    };
  }

  // Translate to English for vector database search
  const translatedEnglish = await translateText({
    input: query,
    sourceLanguageCode: detected.languageCode,
    targetLanguageCode: 'en-IN',
    model: 'sarvam-translate:v1',
  });

  return {
    englishQuery: translatedEnglish || query,
    originalQuery: query,
    detectedLanguage: detected,
  };
}

/**
 * Translate final LLM answer back into the user's detected language if needed.
 *
 * @param {Object} params
 * @param {string} params.answer - Generated answer text (usually in English or mixed)
 * @param {Object} params.detectedLanguage - Result from processIncomingQuery
 * @returns {Promise<string>}
 */
async function formatAnswerInUserLanguage({ answer, detectedLanguage }) {
  if (!answer || !detectedLanguage || !detectedLanguage.isNonEnglish) {
    return answer;
  }

  // If the answer is already predominantly in the target script (e.g. Devanagari for Hindi),
  // we don't need to re-translate it.
  const hasDevanagari = /[\u0900-\u097F]/.test(answer);
  const hasBengali = /[\u0980-\u09FF]/.test(answer);
  const hasTamil = /[\u0B80-\u0BFF]/.test(answer);
  const hasTelugu = /[\u0C00-\u0C7F]/.test(answer);
  const hasGujarati = /[\u0A80-\u0AFF]/.test(answer);
  const hasKannada = /[\u0C80-\u0CFF]/.test(answer);
  const hasMalayalam = /[\u0D00-\u0D7F]/.test(answer);

  const nativeScriptPresent = hasDevanagari || hasBengali || hasTamil || hasTelugu || hasGujarati || hasKannada || hasMalayalam;

  // If LLM already generated in native script, keep it
  if (nativeScriptPresent) {
    return answer;
  }

  // Otherwise, translate English answer into user's language using Sarvam
  const translatedAnswer = await translateText({
    input: answer,
    sourceLanguageCode: 'en-IN',
    targetLanguageCode: detectedLanguage.languageCode,
    model: 'sarvam-translate:v1',
  });

  return translatedAnswer || answer;
}

module.exports = {
  detectLanguage,
  translateText,
  processIncomingQuery,
  formatAnswerInUserLanguage,
};
