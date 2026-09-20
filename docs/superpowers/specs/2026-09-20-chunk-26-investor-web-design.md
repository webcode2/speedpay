# Chunk 26 — Next.js Investor Web Design

**Date:** 2026-09-20  
**Status:** Approved — implementing  
**Scope:** Responsive investor portal on existing APIs. No new financial logic or schema.

## Decisions

| Decision | Choice |
|---|---|
| Auth | Cookie session + client InvestorShell (mirrors admin) |
| Data | Existing investor APIs only; dashboard aggregates client-side |
| Settings | Links hub (security, PIN, profile, payouts) — no new settings API |
| Flutter | Unchanged |

## Routes

Dashboard, packages (+ detail/purchase), investments (+ detail), returns, wallet, transactions, deposits, withdrawals, maturity, reinvest, notifications, profile, verification, onboarding, payout-accounts, security, settings.
