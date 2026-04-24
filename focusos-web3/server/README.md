## Admin API Example

This is a backend example for secure admin authorization and real on-chain mint execution.

### Run

```bash
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
```

### Why this exists

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
