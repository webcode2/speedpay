# Chunk 07 — Investment Packages Design

**Date:** 2026-09-20  
**Status:** Approved — implementing  
**Depends on:** Chunk 06 projects  
**Scope:** Admin packages, versioning, inventory. No marketplace purchase/Flutter.

## Decisions

| Decision | Choice |
|---|---|
| Clients | Admin web only |
| Terms snapshot | `package_versions` on activate / financial edit while OPEN |
| Inventory | Columns on package: totalLots, reservedLots, soldLots; available = total − reserved − sold |
| Money | `lotPrice` text (display/currency string for now); `returnRate` text; `durationDays` int |
| Return types | `FIXED_RETURN`, `FIXED_PROFIT` |

## Statuses / lifecycle

DRAFT → activate → OPEN; pause ↔ PAUSED; FULL when available≤0; close → CLOSED; archive → ARCHIVED.

## APIs / UI

`/api/admin/packages*`, `/admin/packages`, `/admin/packages/new`, `/admin/packages/[id]`.

## Out of scope

Purchase, Flutter marketplace, wallet, oversell locking beyond inventory math helpers.
