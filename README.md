# Werker API CLI

Command-line access for Werker workspaces. Requires Node.js 20 or newer.

```bash
npm install -g github:WerkerInc/werker-api-cli
export WERKER_API_KEY='wk_test_…'
werker balance
werker usage --json
werker experts search "onboarding"
werker bookings --json
werker book expert-abcdef123456 2026-10-10T15:00:00Z "Review our onboarding and explain where users get stuck" --idempotency-key d8fc9852-fc99-40c7-aa4b-273e4cb16b46
werker mcp
```

Create a key in the [Werker dashboard](https://app.werker.ai), then store it in a secret manager or environment variable. Keys are shown once. Booking requires the key's `book` scope and enough test balance to cover the expert's 30-minute rate. Use the `start_at` value returned by expert search. Supply the same idempotency UUID when retrying; if omitted, the CLI generates one and prints it before sending the request. `werker mcp` prints the remote [Streamable HTTP MCP](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md) endpoint. Configure your agent to send the same key as a bearer token. The MCP tools are `get_balance`, `get_usage`, `search_experts`, `book_expert`, and `list_bookings`.

The CLI and API use Stripe test mode. Available and reserved balances are US dollars in the default display, or integer US cents with `--json`. The CLI does not store the key on disk. Set `WERKER_API_URL` and `WERKER_MCP_URL` to override the development service addresses.
