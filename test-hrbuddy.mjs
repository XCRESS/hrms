/**
 * HR Buddy Chat Test Script
 * Tests the chatbot with a sequence of HR queries using admin credentials.
 * Run: node test-hrbuddy.mjs
 */

const BASE_URL = 'http://localhost:4000/api';
const EMAIL    = 'veshant@cosmosfin.com';
const PASSWORD = // ask Veshant for the password.

// Queries to run in sequence (same conversation)
const QUERIES = [
  'How many leaves did Kunal have in May 2026?',
  'What are the joining dates of Sonali and Kunal?',
  'On which dates were Sonali and Kunal absent in May 2026?',
  'Show me the attendance regularization requests of Sonali and Kunal in May 2026.',
];

// ── helpers ──────────────────────────────────────────────────────────────────

function separator(label) {
  const line = '─'.repeat(70);
  console.log(`\n${line}`);
  if (label) console.log(`  ${label}`);
  console.log(line);
}

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on ${path}: ${JSON.stringify(json)}`);
  }
  return json;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  separator('STEP 1 — Login');
  console.log(`  email   : ${EMAIL}`);

  const loginRes = await post('/auth/login', { email: EMAIL, password: PASSWORD });
  const token = loginRes.token ?? loginRes.data?.token;

  if (!token) {
    console.error('Login failed — no token in response:', loginRes);
    process.exit(1);
  }
  console.log('  ✓ Login successful');
  console.log(`  token   : ${token.slice(0, 40)}…`);

  separator('STEP 2 — HR Buddy queries');

  let conversationId = null;

  for (let i = 0; i < QUERIES.length; i++) {
    const query = QUERIES[i];
    console.log(`\n[Query ${i + 1}/${QUERIES.length}]`);
    console.log(`  Q: ${query}`);
    console.log('  … waiting for response …');

    const body = { message: query };
    if (conversationId) body.conversation_id = conversationId;

    const start = Date.now();
    const chatRes = await post('/chat', body, token);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    conversationId = chatRes.data?.conversation_id ?? chatRes.conversation_id ?? conversationId;

    const reply = chatRes.data?.response ?? chatRes.response ?? JSON.stringify(chatRes);
    console.log(`  A (${elapsed}s):\n`);
    // Indent reply for readability
    reply.split('\n').forEach(line => console.log(`    ${line}`));
  }

  separator('DONE');
  console.log(`  conversation_id : ${conversationId}`);
  console.log(`  queries run     : ${QUERIES.length}`);
  console.log();
}

main().catch(err => {
  console.error('\n✗ Test failed:', err.message);
  process.exit(1);
});
