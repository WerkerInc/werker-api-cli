import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import test from 'node:test';

const mock = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.headers.authorization !== 'Bearer wk_test_fixture') { res.writeHead(401); res.end('{"error":{"message":"Invalid key"}}'); return; }
  if (req.url === '/v1/balance') { res.end('{"currency":"usd","balances":{"customer_available":1250,"customer_reserved":500}}'); return; }
  if (req.url === '/v1/usage') { res.end('{"data":[]}'); return; }
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
test('exits cleanly', () => mock.close());
