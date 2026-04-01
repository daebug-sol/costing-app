# Fase D–F — Penyelarasan diagram, parity, dan dokumen keluaran

## Fase D — Sub-engine & alur data

| Perubahan | Deskripsi |
|-----------|-----------|
| **Drain pan** | Modul tersendiri `lib/calculations/drainPan.ts` (`calculateDrainPan`). Section **Drain Pan** di hasil recalculate (antara Structure dan Coil). Baris drain tidak lagi digandakan di `calculateStructure`. |
| **Damper FA & RA** | Dua set line item (FA + RA) digabung dalam satu section **Damper** bila keduanya aktif. Flag `damper.includeFA` / `includeRA` di `ahuRecalcParams`; legacy `damper.type` saja tetap didukung (`resolveDamperModes`). |
| **Motor / fan** | Tetap lewat `calculateFanMotor` → section Fan & Motor (setara lookup ke BOM, bukan bypass terpisah). |

## Fase E — Parity Excel (Decimal)

| Item | Status |
|------|--------|
| `calculateDrainPanCost` | Mengimplementasikan total kg + biaya SS304 untuk dua baris drain (selaras `calculateDrainPan`). |
| `calculateFrameWeight` / `calculateStructureWeight` / `calculateCoilCostBlock` | Tetap stub / perlu mapping baris per baris dari `excel-formulas-dump.json` pada iterasi berikutnya. |
| Tes | `lib/calculations/drainPan.test.ts` membandingkan jumlah kg line items vs `calculateDrainPanCost`. |

## Fase F — Output dokumen (Quotation / PDF / Excel)

- **Internal costing / detail**: `costingProjectToSectionDocs` (`lib/quotation-export-mappers.ts`) mengiter semua `segments[].sections[]` — section baru **Drain Pan** dan baris damper FA+RA otomatis masuk dokumen yang memakai `SectionDoc`.
- **Quotation**: total proyek tetap mengikuti `rollupProjectFinancials` + `syncQuotationItemsFromProject`; tidak ada perubahan kontrak API kutipan.

## Referensi kode

- Recalculate: `app/api/projects/[id]/segments/[segmentId]/recalculate/route.ts`
- UI parameter: `components/costing/costing-workspace.tsx` (`initialAhuFromSegment`, checkbox damper FA/RA)
