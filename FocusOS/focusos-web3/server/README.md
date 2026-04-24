## FocusOS Backend

Express.js backend for FocusOS with admin mint endpoint.

### Setup

1. Install dependencies:
   ```bash
   cd focusos-web3/server
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your values:
   - `RPC_URL`: Your Ethereum RPC endpoint
   - `PRIVATE_KEY`: Private key of the signer wallet (without 0x)
   - `CONTRACT_ADDRESS`: Deployed FocusToken contract address
   - `ADMIN_ALLOWLIST`: Comma-separated list of admin wallet addresses
   - `PORT`: Port to run the server (default 3001)

### Run

```bash
npm start
```

### Endpoint

- `POST /admin/mint`: Mints tokens to a specified address after verifying admin signature.

Request body:
```json
{
  "requester": "0x...",
  "to": "0x...",
  "amount": 100,
  "nonce": "unique-nonce",
  "message": "FocusOS admin mint authorization\nrequester:0x...\nto:0x...\namount:100\nnonce:unique-nonce",
  "signature": "0x..."
}
```

### Security

- Verifies signature matches requester
- Checks requester is in admin allowlist
- Uses backend signer for contract calls
