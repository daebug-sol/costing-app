---
paths:
  - "lib/calculations/**"
  - "lib/ahu-*.ts"
  - "lib/project-rollup.ts"
  - "lib/manual-costing-rollup.ts"
---

# Calculations, AHU, rollups

- One place per concern (frame/panel, coil, damper, fan, structure, skid) in `lib/calculations/`; orchestrated by `lib/ahu-segment-costing.ts`. Never duplicate formulas in components.
- `ahu-recalc-params.ts` (JSON shape) and `ahu-recalc-validation.ts` must stay aligned with `components/costing/costing-workspace.tsx` and the recalculate API body.
- Recalculate API persists sections/line items, then calls `rollupProjectFinancials` (`lib/project-rollup.ts`) — do not re-implement rollups in routes. Don't double-apply margin.
- Excel-parity changes: document rounding steps and add/update tests.
- `lib/costing-scope.ts` flags affect UI and server; change both.
- Use the `costing-formula-change` skill. Edits require `ALLOW_CALC_EDIT=1`.
