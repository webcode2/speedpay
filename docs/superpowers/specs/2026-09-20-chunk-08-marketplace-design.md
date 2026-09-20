# Chunk 08 — Investment Marketplace Design

**Date:** 2026-09-20  
**Status:** Approved — implementing  
**Scope:** Investor Flutter browse + quote. No payment/purchase.

## APIs (investor session)

- `GET /api/marketplace/packages` — status OPEN (and FULL shown as sold out optional — only OPEN)
- `GET /api/marketplace/packages/[id]`
- `POST /api/marketplace/packages/[id]/quote` `{ lotCount }`

## Quote

principal = lotCount × lotPrice; expectedReturn = principal × (returnRate/100); maturityValue = principal + expectedReturn; maturityAt = now + durationDays. Validates min/max/available.
