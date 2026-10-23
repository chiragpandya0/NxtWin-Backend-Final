# NxtWin / gaffr. Phase 0: AMM prediction market

Free-to-play Premier League stat markets. The house is the liquidity provider (LMSR automated market maker, £1 shares).

```
backend/    Express + Socket.IO + MongoDB API (see backend/README.md)
frontend/   Next.js app (users + /admin)
deploy/     deploy.sh, nginx site, systemd units
```

## Run locally
```bash
# terminal 1: backend (needs a MongoDB replica set; Atlas works, or `node scripts/dev-db.js` for a throwaway one)
cd backend && cp .env.example .env     # set MONGODB_URI and JWT_SECRET
npm install && node scripts/seed-pl.js && npm start     # http://localhost:5500

# terminal 2: frontend (forwards /api and /socket.io to the backend, so no URLs to configure)
cd frontend && npm install && npm run dev               # http://localhost:3000
```
Create the admin login: `cd backend && ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='...' node scripts/create-admin.js`.

## Deploy (server)
One script does everything: `./deploy/deploy.sh` (first time: `./deploy/deploy.sh setup`). See the header of `deploy/deploy.sh` for all commands.
Nginx serves the frontend at `/` and forwards `/api`, `/socket.io` and `/health` to the backend, all on one domain, so there is no CORS or API URL to set.
