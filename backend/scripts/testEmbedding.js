'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { embedTexts } = require('../services/embeddingClient');

async function runTest() {
  console.log('--- Testing Node.js Embedding HTTP Client ---');
  try {
    const inputTexts = [
      'The quick brown fox',
      'jumps over the lazy dog'
    ];
    console.log('Input texts:', inputTexts);

    const embeddings = await embedTexts(inputTexts);

    console.log('\n--- Results ---');
    console.log('Number of embeddings returned:', embeddings.length);
    console.log('Length of first embedding (dimensions):', embeddings[0].length);
    console.log('Length of second embedding (dimensions):', embeddings[1].length);
    console.log('First 5 values of first embedding:', embeddings[0].slice(0, 5));

    if (embeddings.length === 2 && embeddings[0].length === 384) {
      console.log('\n✅ SUCCESS: Received 2 embeddings, each of length 384!');
    } else {
      console.error('\n❌ FAILED: Unexpected embeddings output dimensions');
    }
  } catch (err) {
    console.error('\n❌ FAILED with error:', err.message);
  }
}

runTest();
