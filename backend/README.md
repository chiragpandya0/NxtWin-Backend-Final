# gaffr. Phase 0 backend: AMM prediction market

Free-to-play Premier League stat markets. The house is the liquidity provider: an LMSR automated market maker
prices every line (no order book), shares pay £1, fees are 2% (configurable). See the Phase 0 proposal.

## Run locally
```bash
cd backend
npm install
cp .env.example .env        # set MONGODB_URI (a replica set / Atlas: transactions are required) and JWT_SECRET
ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='change-me-123' node scripts/seed-pl.js   # demo gameweek + admin
npm start
```
Node 20+. Tests: `npm test` (unit + integration, uses an in-memory replica set). Acceptance replay: `node scripts/replay-matchday.js`.

## How it works
- `src/engine/` pure maths: `lmsr.js` (cost/price/buy/sell, max-loss), `model.js` (Poisson/negative binomial),
  `ladder.js` (P(over 3.5) >= P(over 4.5) >= ...), `acca.js` (accumulator pricing).
- Money is integer pence. Every movement is an append-only `LedgerEntry` with a unique idempotency key, written in the
  same Mongo transaction as the balance change. Rounding favours the house. `GET /api/admin/reports/reconcile` checks balance == ledger.
- Settlement (`services/settlement.js`) is idempotent: re-running pays nothing twice; a different result is a correction
  (previous payouts reversed, then the new outcome paid). Void = refund of net cost; void accumulator legs drop out.
- Auth: email + password (bcrypt), 18+ date-of-birth gate, JWT bearer. Admin = `role: admin` (set via `ADMIN_EMAIL`).

## API
Public: `GET /api/markets`, `/api/markets/:id`, `/api/markets/:id/history`, `/api/fixtures`, `/api/players/:id/markets`, `/api/leaderboard`.
Auth: `POST /api/auth/signup|login`, `GET /api/auth/me`.
Trading (Bearer): `POST /api/trade/quote|execute`, `POST /api/accas/quote`, `POST /api/accas`, `POST /api/accas/:id/sell`,
`GET /api/portfolio`, `GET /api/ledger`, `POST /api/wallet/top-up`.
Admin (`/api/admin/*`): settings, teams, players (+import), fixtures, generate/open markets, market edit/status/void, results entry,
settle, correct, users/ledger/adjust, reports (exposure, reconcile, calibration CSV, summary), audit log.
Sockets: `priceUpdate`, `balanceUpdate`, `marketStatus` (client emits `joinMarket`, `auth` with its token).

## Not verified / open items
- Sportmonks adapter (`services/ingestion/sportmonks.js`, fixtures only) is unverified against the live API (needs an account).
  Results are entered through the admin API/page for now. Betfair / The Odds API reference-price adapters are stubs
  (`services/reference/`): the de-vig and logging are done, the API calls need credentials.
- Top-up rule is a placeholder (below £10, once per 7 days, to £1,000) pending confirmation.
- Same-match accumulator discount is applied to the payout (0.9 per extra leg); the proposal doesn't say whether to apply it to probability.
- Ladder repairs move `q` without a user trade, so reported exposure is approximate when they occur.
