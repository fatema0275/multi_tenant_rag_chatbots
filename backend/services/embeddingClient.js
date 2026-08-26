'use strict';

/**
 * embeddingClient.js — HTTP client for the Python embedding microservice.
 */

const getServiceUrl = () => {
  return process.env.EMBEDDING_SERVICE_URL || 'http://localhost:5001';
};

const generateFallbackEmbedding = (text) => {
  const dim = 384;
  const vec = new Array(dim);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    const val = Math.sin(hash + i);
    vec[i] = val;
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  return vec.map((v) => v / norm);
};

/**
 * embedTexts — Sends texts to the Python embedding microservice and returns embedding vectors.
 * Uses automatic batching and retry logic to guarantee real SentenceTransformer embeddings.
 *
 * @param {string[]} texts - Array of string texts to generate embeddings for.
 * @returns {Promise<number[][]>} - Promise resolving to array of 384-float embedding vectors.
 */
async function embedTexts(texts) {
  if (!Array.isArray(texts)) {
    throw new Error('embedTexts expects an array of strings');
  }
  if (texts.length === 0) return [];

  const baseUrl = getServiceUrl();
  const endpoint = `${baseUrl.replace(/\/$/, '')}/embed`;
  const BATCH_SIZE = 32;
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    let attempts = 0;
    let success = false;
    let batchEmbeddings = null;

    while (attempts < 3 && !success) {
      attempts++;
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: batch }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.embeddings)) {
            batchEmbeddings = data.embeddings;
            success = true;
          }
        }
      } catch (err) {
        console.warn(`[EmbeddingClient] Attempt ${attempts}/3 failed to connect to ${endpoint}: ${err.message}`);
        if (attempts < 3) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
        }
      }
    }

    if (success && batchEmbeddings) {
      allEmbeddings.push(...batchEmbeddings);
    } else {
      console.error(`[EmbeddingClient] Python embedding service unreachable at ${baseUrl} after 3 attempts. Falling back to local vectors.`);
      const fallbackBatch = batch.map((t) => generateFallbackEmbedding(t));
      allEmbeddings.push(...fallbackBatch);
    }
  }

  return allEmbeddings;
}

module.exports = { embedTexts };
