#!/usr/bin/env node
import crypto from 'node:crypto';

const base = process.env.WERKER_API_URL || 'https://melvin--werker-api-dev-service.modal.run';
const mcp = process.env.WERKER_MCP_URL || 'https://melvin--werker-mcp-dev-service.modal.run/mcp';
const command = process.argv[2] || 'help';
const json = process.argv.includes('--json');

function formatMoney(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

async function fetchAccount(path, options = {}) {
  const key = process.env.WERKER_API_KEY;
  if (!key) throw new Error('Set WERKER_API_KEY to a key from your Werker dashboard.');
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${key}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    signal: AbortSignal.timeout(options.body ? 60_000 : 15_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || `Werker API returned ${response.status}`);
  return body;
}

try {
  if (command === 'balance') {
    const result = await fetchAccount('/v1/balance');
    if (json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Available  ${formatMoney(result.balances.customer_available || 0)}`);
      console.log(`Reserved   ${formatMoney(result.balances.customer_reserved || 0)}`);
    }
  } else if (command === 'usage') {
    const result = await fetchAccount('/v1/usage');
    if (json) console.log(JSON.stringify(result, null, 2));
    else if (!result.data.length) console.log('No usage events yet.');
    else for (const event of result.data) console.log(`${new Date(event.occurred_at).toISOString().slice(0, 10)}  ${event.kind}  ${formatMoney(event.amount_cents)}`);
  } else if (command === 'experts' && process.argv[3] === 'search') {
    const query = process.argv.slice(4).filter(item => item !== '--json').join(' ').trim();
    if (query.length < 2) throw new Error('Usage: werker experts search "what your agent needs"');
    const result = await fetchAccount(`/v1/experts?${new URLSearchParams({ q: query })}`);
    if (json) console.log(JSON.stringify(result, null, 2));
    else if (!result.data.length) console.log('No matching experts yet.');
    else for (const expert of result.data)
      console.log(`${expert.headline}  ${formatMoney(expert.rate_cents_per_30_min)}/30 min  ${expert.slug}`);
  } else if (command === 'bookings') {
    const result = await fetchAccount('/v1/bookings');
    if (json) console.log(JSON.stringify(result, null, 2));
    else if (!result.data.length) console.log('No bookings yet.');
    else for (const booking of result.data)
      console.log(`${new Date(booking.start_at).toISOString()}  ${booking.expert_headline}  ${booking.status}  ${booking.meeting_url || ''}`);
  } else if (command === 'book') {
    const [slug, startAt, taskPrompt] = process.argv.slice(3, 6);
    if (!slug || !startAt || !taskPrompt) throw new Error('Usage: werker book <expert-slug> <ISO-start> "task prompt" [--idempotency-key UUID]');
    const keyIndex = process.argv.indexOf('--idempotency-key');
    const idempotencyKey = keyIndex >= 0 ? process.argv[keyIndex + 1] : crypto.randomUUID();
    if (!idempotencyKey) throw new Error('Pass a UUID after --idempotency-key');
    if (keyIndex < 0) console.error(`Idempotency key for retries: ${idempotencyKey}`);
    const result = await fetchAccount('/v1/bookings', { method: 'POST', body: JSON.stringify({
      expert_slug: slug, start_at: startAt, task_prompt: taskPrompt, idempotency_key: idempotencyKey,
    }) });
    if (json) console.log(JSON.stringify(result, null, 2));
    else console.log(`${result.booking.status}  ${result.booking.expert_headline}  ${new Date(result.booking.start_at).toISOString()}  ${result.booking.meeting_url || ''}`);
  } else if (command === 'mcp') {
    console.log(mcp);
  } else if (command === 'version' || command === '--version') {
    console.log('werker 0.1.0');
  } else if (command === 'help' || command === '--help' || command === '-h') {
    console.log('Werker CLI\n\n  werker balance [--json]             Show workspace funds\n  werker usage [--json]               Show recent usage\n  werker experts search "query"       Find human experts\n  werker bookings [--json]            List workspace bookings\n  werker book <slug> <ISO-start> "task prompt" [--idempotency-key UUID]\n                                      Reserve funds and create a call\n  werker mcp                          Print the remote MCP endpoint\n\nSet WERKER_API_KEY to a key from your dashboard.');
  } else {
    throw new Error(`Unknown command: ${command}. Run werker help.`);
  }
} catch (error) {
  console.error(`werker: ${error.message}`);
  process.exitCode = 1;
}
