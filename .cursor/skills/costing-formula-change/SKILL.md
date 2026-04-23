---
name: costing-formula-change
description: >-
  Use when changing AHU costing math, lib/calculations, recalculate behavior,
  costing scope, or parity with Excel/reference workbooks. Not for generic UI-only edits.
---

# Costing formula & AHU recalc changes

## Before editing

1. Identify **which block** changes: Frame & Panel, Skid, Structure, Coil, Damper, Fan & Motor, or rollup.
2. Read the current implementation in `lib/calculations/` and `lib/ahu-segment-costing.ts` (and `app/api/projects/[id]/segments/[segmentId]/recalculate/route.ts` for persistence).
3. If matching Excel: confirm **rounding** and **order of operations** (Excel vs JS float).

## Implementation

- Keep **pure calculation** in `lib/calculations/*.ts` where possible. Return `CalcLineItem`-style data consistent with existing callers.
- Update **`lib/ahu-recalc-validation.ts`** if new required inputs appear; mirror labels/fields in `components/costing/costing-workspace.tsx`.
- After changing segment totals, **`rollupProjectFinancials`** must still run for the project (recalculate route already does this).

## Verify

- Run **`pnpm test`** or **`npm test`** if tests cover the touched module; add tests for new branches or regression risks.
- Manually: create/edit an AHU segment, **Hitung ulang**, confirm sections and project `totalHPP` / `totalSelling` look sane.

## Do not

- Change quotation PDF/Excel generators unless the task includes export behavior.
- Silently change default `costingScope` behavior without noting migration for stored JSON.
