# Video demo: one match, start to finish

Reset anytime with `./deploy/deploy.sh demo` (server) or `node scripts/seed-demo.js` in `backend/` (local).
Remove it afterwards with `./deploy/deploy.sh demo-clean`.

**The scenario:** Arsenal v Manchester City (gameweek 99, kicks off in 2 days). 21 markets on 4 players:
Saka and Havertz (Arsenal), Haaland and Foden (Man City). Two stats: **shots** and **goals**.

## Football in 30 seconds
- A **shot** is an attempt to score. A **goal** is a shot that went in.
- "**Over 2.5 shots**" means 3 or more shots. "**Over 0.5 goals**" means the player scores at least once.
- Each market is a YES/NO bet. The price is the chance (62p = 62%). A winning share pays £1.
- **Haaland** is City's main striker, so he's likely to score and shoot a lot.
- **Havertz** in this demo does **not play** (injured). His markets get voided and refunded.

## Logins (password for all: `demo-pass-123`)
| Who | Email | Role in the story |
|---|---|---|
| Alice | alice@demo.test | You, trading live on camera |
| Bob | bob@demo.test | Already bought "Haaland scores" (wins) |
| Cara | cara@demo.test | Already bet "Saka won't score" (loses) |
| Admin | your admin login | Enters results and settles |

## Part 1: user (sign in as Alice)
1. Open **Bids**. One card per player, each stat is a row of lines with prices. Point out Haaland 62p to score.
2. Click **Bukayo Saka**, open **Shots over 2.5** (43p).
   Buy **20 YES shares**. Cost about **£9.28**. The balance drops and the price moves.
3. Open **Phil Foden goals over 0.5** (YES 23p / NO 77p). Select **NO**, buy **10 shares**. Cost about **£7.91**.
4. Build an accumulator ("accumulator" = several picks that must all win, for a bigger payout):
   on **Haaland goals over 0.5** pick YES and click *Add YES to accumulator*;
   on **Kai Havertz shots over 0.5** pick YES and click *Add*.
   Open the **Slip**, stake **£5**: it shows chance **49.2%**, pays about **£9.96**. Place it.
5. Open **Portfolio**: 2 positions and the accumulator.

## Part 2: admin
1. **Overview:** reconcile shows OK; house exposure table lists each market's worst-case loss.
2. **Fixtures:** find **Arsenal v Manchester City, GW99**. Click **Enter results** and type (leave other boxes empty):

| Player | Min | Shots | Goals |
|---|---|---|---|
| Bukayo Saka | 90 | 4 | 1 |
| Erling Haaland | 90 | 3 | 1 |
| Phil Foden | 78 | 2 | 0 |
| Kai Havertz | *leave the whole row empty* | | |

   Click **Save results**, then **Settle**. It reports 21 settled.
3. Click **Settle** again: nothing changes (it can't pay twice).

## What you'll see after settling (as Alice)
| Item | Result |
|---|---|
| Saka shots over 2.5 YES | **Won** (he had 4 shots) |
| Foden goals over 0.5 NO | **Won** (he scored 0) |
| Accumulator | **Won**, Havertz leg is void and drops out, pays about **£7.86** |
| Alice balance | about **£977.81 → £1,015.67** (+£15.67) |
| Bob | £945.21 → £1,045.21 (+£45.21) |
| Cara | £951.28 → £981.28 (-£18.72) |
| **Leaderboard** (GW99) | 1. Bob +£45.21, 2. Alice +£15.67, 3. Cara -£18.72 |

Resolutions: all Saka lines YES; Haaland goals 0.5 YES, goals 1.5 NO, shots 0.5/1.5/2.5 YES, shots 3.5 NO;
Foden goals NO, shots 0.5/1.5 YES, shots 2.5/3.5 NO; **every Havertz market VOID**.
Numbers match only if you buy exactly the share counts above.

## Bonus beats
- In **Markets**, click **Correct** on a settled market and change the result: balances swing, reconcile stays OK.
- **Users → Ledger** on Alice shows every movement of her money.
- Before recording, reset with `demo` so prices and balances are fresh.
