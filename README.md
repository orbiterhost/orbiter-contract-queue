# Orbiter Contract Queue

This specialized Cloudflare Worker handles a queue system for creating and updating smart contracts for Orbiter sites. Instead of waiting for blockchain transactions to finalize before sending site responses, the API will send a message to this queue where it can either:

1. Create a new site contract using the Orbiter Contract Factory
2. Update an existing site contract with a new CID mapping

This allows us to keep site creation and updates fast while handling blockchain transactions in the background.

## Development

Clone the repo and install dependencies

```bash
git clone https://github.com/orbiterhost/orbiter-contract-queue
cd orbiter-contract-queue
bun install
```

Setup environment variables
```typescript
interface Env {
	CONTRACT_QUEUE: Queue;
	ORBITER_PRIVATE_KEY: string;
	BASE_ALCHEMY_URL: string;
	CONTRACT_ADDRESS: string;
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string;
	SITE_CONTRACT: KVNamespace;
}
```

## Deployment

Ensure all secrets have been stored in Cloudflare using the wrangler CLI

```bash
bunx wrangler secret put SECRET_NAME
# Will prompt you to enter secret
```

Run deployment command

```bash
bun run deploy
```
