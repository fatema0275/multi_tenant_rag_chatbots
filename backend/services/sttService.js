'use strict';

/**
 * services/sttService.js
 * Speech-to-Text service integration via Sarvam AI API (Saaras v4)
 */

/**
 * Transcribe base64 encoded audio using Sarvam AI STT API.
 * 
 * @param {Object} params
 * @param {string} params.audio - Base64 encoded audio string (raw or data URL)
 * @param {string} [params.mimeType] - Audio MIME type (e.g. 'audio/webm', 'audio/wav', 'audio/mp4')
 * @param {string} [params.languageCode] - BCP-47 language code or 'unknown' for auto-detection
 * @param {string} [params.model] - Model name ('saaras:v4' by default)
 * @returns {Promise<{transcript: string, language_code: string, request_id: string|null}>}
 */
async function transcribeAudio({ audio, mimeType = 'audio/webm', languageCode = 'unknown', model = 'saaras:v4' }) {
  const sarvamApiKey = process.env.SARVAM_API_KEY;
  if (!sarvamApiKey || !sarvamApiKey.trim()) {
    const error = new Error('SARVAM_API_KEY is not configured in backend/.env. Please add your Sarvam API key to backend/.env.');
    error.statusCode = 503;
    error.code = 'SARVAM_API_KEY_MISSING';
    throw error;
  }

  if (!audio || typeof audio !== 'string' || !audio.trim()) {
    const error = new Error('Audio data is required (base64 string)');
    error.statusCode = 400;
    throw error;
  }

  // Strip possible data URI header (e.g., "data:audio/webm;codecs=opus;base64,")
  const base64Data = audio.replace(/^data:[^;]+;base64,/, '').trim();
  const audioBuffer = Buffer.from(base64Data, 'base64');
  if (audioBuffer.length === 0) {
    const error = new Error('Audio data is empty or invalid base64');
    error.statusCode = 400;
    throw error;
  }

  const effectiveMimeType = (mimeType && typeof mimeType === 'string')
    ? mimeType.split(';')[0].trim().toLowerCase()
    : 'audio/webm';

  // Determine file extension
  let ext = 'webm';
  if (effectiveMimeType.includes('wav')) ext = 'wav';
  else if (effectiveMimeType.includes('mp3') || effectiveMimeType.includes('mpeg')) ext = 'mp3';
  else if (effectiveMimeType.includes('mp4') || effectiveMimeType.includes('m4a')) ext = 'm4a';
  else if (effectiveMimeType.includes('ogg')) ext = 'ogg';
  else if (effectiveMimeType.includes('aac')) ext = 'aac';

  // Build FormData payload
  const audioBlob = new Blob([audioBuffer], { type: effectiveMimeType });
  const formData = new FormData();
  formData.append('file', audioBlob, `recording.${ext}`);
  formData.append('model', model || 'saaras:v4');
  formData.append('language_code', languageCode || 'unknown');
  formData.append('mode', 'transcribe');

  const response = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: {
      'api-subscription-key': sarvamApiKey.trim(),
    },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.error?.message || data?.message || `Sarvam STT failed with HTTP ${response.status}`;
    const error = new Error(errorMessage);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return {
    transcript: (data.transcript || '').trim(),
    language_code: data.language_code || languageCode || 'unknown',
    request_id: data.request_id || null,
  };
}

/**
 * Express route handler for Speech-to-Text
 */
async function handleSpeechToText(req, res) {
  try {
    const { audio, mime_type, mimeType, language_code, languageCode, model } = req.body || {};
    const result = await transcribeAudio({
      audio,
      mimeType: mime_type || mimeType || 'audio/webm',
      languageCode: language_code || languageCode || 'unknown',
      model: model || 'saaras:v4',
    });

    return res.status(200).json({
      success: true,
      transcript: result.transcript,
      language_code: result.language_code,
      request_id: result.request_id,
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    if (statusCode >= 500 && statusCode !== 503) {
      console.error('[Sarvam STT Error]:', err.message);
    }
    return res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || null,
      details: err.details || null,
    });
  }
}

module.exports = {
  transcribeAudio,
  handleSpeechToText,
};
