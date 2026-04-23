---
name: costing-exports
description: >-
  Use when changing PDF or Excel quotation/costing output: lib/generators/pdfGenerator.ts,
  excelGenerator.ts, merge-quotation-doc, or quotation-export-mappers.
---

# Quotation PDF & Excel exports

## Scope

- **PDF**: `lib/generators/pdfGenerator.ts` (jsPDF).
- **Excel**: `lib/generators/excelGenerator.ts` (ExcelJS).
- **Document assembly**: `lib/merge-quotation-doc.ts`, `lib/quotation-export-mappers.ts`, `lib/generators/document-types.ts`.

## Guidelines

1. Keep **financial totals** consistent with `lib/quotation-financials.ts` and stored quotation rows.
2. Changing **layout** should not change **calculation** — calculations stay on server / DB; exports are presentation.
3. After changes, generate a sample quotation in the app and spot-check **subtotal, discount, PPN, grand total**.
4. Large template edits: consider a **before/after** snapshot (file size and page count) to catch accidental blank pages or overflow.

## Do not

- Import browser-only APIs into server-only code paths or vice versa without checking Next.js boundaries.
