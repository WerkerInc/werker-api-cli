import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import test from 'node:test';

const mock = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.headers.authorization !== 'Bearer wk_test_fixture') { res.writeHead(401); res.end('{"error":{"message":"Invalid key"}}'); return; }
  if (req.url === '/v1/balance') { res.end('{"currency":"usd","balances":{"customer_available":1250,"customer_reserved":500}}'); return; }
  if (req.url === '/v1/usage') { res.end('{"data":[]}'); return; }
  if (req.url === '/v1/experts?q=onboarding') { res.end('{"data":[{"headline":"Product designer","rate_cents_per_30_min":6000,"slug":"expert-abcdef123456"}]}'); return; }
  if (req.url === '/v1/bookings' && req.method === 'GET') { res.end('{"data":[]}'); return; }
  if (req.url === '/v1/bookings' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const input = JSON.parse(body);
      if (input.expert_slug !== 'expert-abcdef123456' || input.task_prompt.length < 20) { res.writeHead(400); res.end('{}'); return; }
      res.writeHead(201); res.end(JSON.stringify({ booking: { status: 'confirmed', expert_headline: 'Product designer', start_at: input.start_at, meeting_url: 'https://meet.google.com/test-room' } }));
    });
    return;
  }
  res.writeHead(404); res.end('{}');
});
await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
const apiUrl = `http://127.0.0.1:${mock.address().port}`;

async function cli(args, key = 'wk_test_fixture') {
  const child = spawn(process.execPath, ['bin/werker.mjs', ...args], {
    cwd: new URL('..', import.meta.url), env: { ...process.env, WERKER_API_URL: apiUrl, WERKER_API_KEY: key },
  });
  let stdout = ''; let stderr = '';
  for await (const chunk of child.stdout) stdout += chunk;
  for await (const chunk of child.stderr) stderr += chunk;
  const code = await new Promise(resolve => child.on('close', resolve));
  return { code, stdout, stderr };
}

test('shows available and reserved balances', async () => {
  const result = await cli(['balance']);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /\$12\.50/);
  assert.match(result.stdout, /\$5\.00/);
});
test('emits machine-readable usage', async () => {
  const result = await cli(['usage', '--json']);
  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.stdout), { data: [] });
});
test('rejects missing credentials', async () => {
  const result = await cli(['balance'], '');
  assert.equal(result.code, 1);
  assert.match(result.stderr, /WERKER_API_KEY/);
});
test('searches expert profiles', async () => {
  const result = await cli(['experts', 'search', 'onboarding']);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Product designer/);
});
test('books an expert with a retry-safe key', async () => {
  const result = await cli(['book', 'expert-abcdef123456', '2026-10-10T15:00:00Z',
    'Review our onboarding and explain why users leave.', '--idempotency-key', 'd8fc9852-fc99-40c7-aa4b-273e4cb16b46']);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /confirmed.*meet\.google\.com/);
});
test('lists bookings', async () => {
  const result = await cli(['bookings', '--json']);
  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.stdout), { data: [] });
});
test('exits cleanly', () => mock.close());
