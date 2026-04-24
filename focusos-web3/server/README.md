## Admin API Example

This is a minimal backend example for secure admin authorization.

### Run

```bash
cd focusos-web3
set ADMIN_ALLOWLIST=0xYourAdminWalletAddress
node server/admin-api-example.mjs
```

### Why this exists

- Frontend checks are not security.
- Backend verifies wallet signature and admin allowlist.
- Only after backend authorization should privileged on-chain actions execute.

### Production note

Replace the `TODO` response in `admin-api-example.mjs` with a real server-side mint transaction using a backend-controlled signer.
