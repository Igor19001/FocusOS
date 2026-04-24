## FocusOS Backend

<<<<<<< HEAD
This is a backend example for secure admin authorization and real on-chain mint execution.
=======
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
>>>>>>> b0521bb852d2c9429bb864ddf3f1b308d0bf0739

### Run

```bash
<<<<<<< HEAD
cd focusos-web3
set PORT=3001
set ADMIN_ALLOWLIST=0xYourAdminWalletAddress
set RPC_URL=https://testnet-rpc.monad.xyz
set TOKEN_ADDRESS=0xYourFocusTokenAddress
set TOKEN_DECIMALS=18
set MINTER_PRIVATE_KEY=0xYourBackendMinterPrivateKey
set ADMIN_MESSAGE_TTL_MS=120000
set NONCE_RETENTION_MS=600000
set ADMIN_ROLE_CHECK_CONTRACT=0xYourAccessControlContract
set ADMIN_ROLE_CHECK_MODE=hasRole
set ADMIN_ROLE_LABEL=MINTER_ROLE
# optional override:
# set ADMIN_ROLE_ID=0x...
# nonce store persistence:
set NONCE_STORE_BACKEND=file
set NONCE_STORE_FILE_PATH=./server/.nonce-store.json
# OR Redis:
# set NONCE_STORE_BACKEND=redis
# set REDIS_URL=redis://localhost:6379
# set REDIS_NONCE_PREFIX=focusos:nonce
npm run server:admin
=======
npm start
>>>>>>> b0521bb852d2c9429bb864ddf3f1b308d0bf0739
```

### Endpoint

<<<<<<< HEAD
- Frontend checks are not security.
- Backend verifies wallet signature, nonce freshness (replay protection), and TTL.
- Nonce replay protection persists across restarts (`file` or `redis` backend).
- Backend executes privileged mint on-chain with a server-controlled signer.
- Backend authorizes requester with on-chain role check (`hasRole` / `owner` / `isAdmin`) and optional ENV allowlist fallback.

### Nonce Store Backends

- `NONCE_STORE_BACKEND=memory` - fast, volatile (lost on restart)
- `NONCE_STORE_BACKEND=file` - persisted JSON file (default)
- `NONCE_STORE_BACKEND=redis` - shared persistent nonce store across instances

### API Contract

`POST /admin/mint`

Required JSON body fields:

- `requester` (wallet that signed)
- `to` (mint destination)
- `amount` (human-readable amount, e.g. `25`)
- `nonce`
- `issuedAt` (unix ms)
- `expiresAt` (unix ms)
- `message`
- `signature`

Message format must match exactly:

`FocusOS admin mint authorization\nrequester:{requester}\nto:{to}\namount:{amount}\nnonce:{nonce}\nissuedAt:{issuedAt}\nexpiresAt:{expiresAt}`
=======
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
>>>>>>> b0521bb852d2c9429bb864ddf3f1b308d0bf0739
