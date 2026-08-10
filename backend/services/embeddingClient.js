'use strict';

/**
 * embeddingClient.js — HTTP client for the Python embedding microservice.
 */

const getServiceUrl = () => {
  return process.env.EMBEDDING_SERVICE_URL || 'http://localhost:5001';
};

/**
 * embedTexts — Sends texts to the Python embedding microservice and returns embedding vectors.
 *
 * @param {string[]} texts - Array of string texts to generate embeddings for.
 * @returns {Promise<number[][]>} - Promise resolving to array of 384-float embedding vectors.
 */
async function embedTexts(texts) {
  if (!Array.isArray(texts)) {
    throw new Error('embedTexts expects an array of strings');
  }

  const baseUrl = getServiceUrl();
  const endpoint = `${baseUrl.replace(/\/$/, '')}/embed`;

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts }),
    });
  } catch (err) {
    throw new Error(`Embedding service unreachable at ${baseUrl} — is it running? (${err.message})`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding service returned status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.embeddings)) {
    throw new Error('Embedding service response missing "embeddings" array');
  }

  return data.embeddings;
}

module.exports = { embedTexts };
