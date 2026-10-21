const { sequelize } = require('../models');
const GROQ_API_KEY = process.env.GROQ_API_KEY;

(async () => {
  const [rows] = await sequelize.query('SELECT chunk_text, page_title, page_url FROM document_chunks WHERE id IN (2931, 2912, 2904, 2989, 2911)');
  const context = rows.map((r, i) => `[Context ${i+1}] (Page: ${r.page_title}, URL: ${r.page_url})\n${r.chunk_text}`).join('\n\n');
  console.log('--- CONTEXT ---');
  console.log(context);
  console.log('--- CALLING GROQ ---');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
      temperature: 0,
      messages: [
        { role: 'system', content: `You are a helpful, knowledgeable, and professional AI assistant representing this website. Your job is to answer visitor questions clearly, accurately, and conversationally using ONLY the verified context passages provided below.

Response Guidelines:
1. Tone & Structure:
   - Provide direct, clear, and well-structured answers.
   - If the visitor asks where a page, service, or feature is located, clearly tell them where it is located.
   - Separate distinct topics or paragraphs with double line breaks for easy readability.
2. Grounding & Boundaries:
   - Answer strictly using the verified context passages. Do not invent facts or speculate.
   - If the context does not contain enough information to answer, state politely: "I don't have enough verified information on that topic in our website knowledge base. Please contact our support team for more details."` },
        { role: 'user', content: `Context passages from this website:\n\n${context}\n\nVisitor question: What cloud and DevOps tools does NovaTech work with?\n\nCleanly formatted answer:` }
      ]
    })
  });
  const data = await res.json();
  console.log('--- GROQ RESPONSE ---');
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
})();
