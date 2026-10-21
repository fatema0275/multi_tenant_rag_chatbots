const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');

const SITE_ID = '1ff03664-112f-4686-a40a-ce608fe9336b';

async function run() {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const res = await fetch(`http://localhost:5000/api/chat/${SITE_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'list down the core service pillars' })
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('\nAnswer:\n', data.answer);
  console.log('\nSources:\n', JSON.stringify(data.sources, null, 2));
}

run().catch(console.error);
