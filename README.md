# Werker API CLI

Command-line access for Werker workspaces. Requires Node.js 20 or newer.

```bash
npm install -g github:WerkerInc/werker-api-cli
export WERKER_API_KEY='wk_test_…'
werker balance
werker usage --json
werker experts search "onboarding"
werker mcp
```

Create a key in the [Werker dashboard](https://app.werker.ai), then store it in a secret manager or environment variable. Keys are shown once. `werker mcp` prints the remote [Streamable HTTP MCP](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md) endpoint. Configure your agent to send the same key as a bearer token. The MCP tools are `get_balance`, `get_usage`, and `search_experts`.

The CLI and API use Stripe test mode. Available and reserved balances are US dollars in the default display, or integer US cents with `--json`. The CLI does not store the key on disk. Set `WERKER_API_URL` and `WERKER_MCP_URL` to override the development service addresses.
