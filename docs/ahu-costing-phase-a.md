# Fase A — Arsitektur costing AHU & kontrak API

Dokumen ini mengikat perilaku server untuk recalculate AHU. **Fase B/C (UI + persistensi)** sudah diimplementasikan: parameter disimpan di `CostingSegment.ahuRecalcParams` (JSON) dan digabung dengan body request saat recalculate.

### Persistensi & merge (Fase B/C)

| Mekanisme | Perilaku |
|-----------|----------|
| **Penyimpanan** | `PUT .../segments/:segmentId` dengan field `ahuRecalcParams` (objek JSON). Set `null` untuk menghapus. |
| **Struktur JSON** | Tipe TypeScript: `lib/ahu-recalc-params.ts` (`AhuRecalcParams`). |
| **Recalculate** | Server memanggil `mergeRecalcParams(parseAhuRecalcParams(segment.ahuRecalcParams), body)` — **nilai di body request menimpa** field yang sama dari DB. Jika body kosong `{}`, hanya nilai tersimpan yang dipakai. |
| **UI** | Workspace costing: form “Parameter kalkulasi”, tombol **Simpan parameter** (hanya PUT) dan **Hitung ulang** (PUT lalu POST recalculate). |

---

## 1. Kontrak `POST /api/projects/:projectId/segments/:segmentId/recalculate`

### Ringkasan

| Properti | Nilai |
|----------|--------|
| Metode | `POST` |
| Content-Type | `application/json` (opsional; body boleh kosong `{}`) |
| Prasyarat | Segmen ada, `segment.type === "ahu"` |
| Respons sukses | `CostingProject` lengkap (sama seperti `costingProjectDetailInclude`) |
| Efek samping | Menghapus semua `CostingSection` + line items segmen ini, menulis ulang dari kalkulator, lalu `rollupProjectFinancials(projectId)`. |

### Isi body (JSON) — semua field opsional

| Field | Tipe | Default jika tidak dikirim | Keterangan |
|-------|------|----------------------------|------------|
| `nSections` | number | `1` | Dipakai hanya untuk `calculateFramePanel` (minimal 1, integer). |
| `coil` | object | `{}` | Lihat tabel nested di bawah. |
| `damper` | object | `{}` | Lihat tabel nested di bawah. |
| `fanMotor` | object | `{}` | Lihat tabel nested di bawah. |

#### `body.coil`

| Field | Default | Keterangan |
|-------|---------|------------|
| `FH` | `segment.dimH` (0 jika null) | Tinggi face coil (mm). |
| `FL` | `segment.dimW` (0 jika null) | Lebar face coil (mm). |
| `rows` | `4` | Jumlah row. |
| `FPI` | `10` | Fin per inch. |
| `circuits` | `2` | Jumlah sirkuit. |

#### `body.damper`

| Field | Default | Keterangan |
|-------|---------|------------|
| `W` | `segment.dimW` | Lebar damper (mm). |
| `H` | `segment.dimH` | Tinggi damper (mm). |
| `includeFA` | `true` (jika tidak ada legacy `type`) | Set `false` untuk tidak menghitung FA. |
| `includeRA` | `true` | Set `false` untuk tidak menghitung RA. |
| `type` | — | **Legacy:** jika `includeFA`/`includeRA` tidak diset: hanya `FA` atau hanya `RA` sesuai nilai. |

Server memanggil `calculateDamper` **sekali per tipe** yang aktif (FA dan/atau RA) dan **menggabungkan** line items dalam satu section **Damper**.

#### `body.fanMotor`

| Field | Default | Keterangan |
|-------|---------|------------|
| `fanModel` | `""` | String kode/nama fan untuk lookup `ComponentCatalog`. |
| `motorKW` | `0` | Daya motor (kW). |
| `motorPoles` | `4` | Kutub motor (integer). |
| `qty` | `segment.qty` (minimal 1) | Kuantitas. |

### Field segmen yang dibaca dari database (bukan dari body)

| Field | Dipakai di recalculate? |
|-------|-------------------------|
| `dimH`, `dimW`, `dimD` | Ya — untuk dimensi, coil default FH/FL, damper default, dan semua modul yang membutuhkan H/W/D. |
| `profileType` | Ya — frame & panel; fallback ke profil Pentapost pertama jika kosong. |
| `qty` | Ya — default `fanMotor.qty` jika tidak dikirim di body. |
| `ahuModel`, `ahuRef` | Tidak — hanya metadata/label. |
| `flowCMH` | **Tidak** — lihat bagian keputusan Flow CMH di bawah. |
| `ahuRecalcParams` | **Tidak langsung** — dibaca server dan digabung dengan body; tidak perlu dikirim ulang di POST jika sudah tersimpan lewat PUT. |

### Urutan section yang dihasilkan (sortOrder)

1. Frame & Panel  
2. Skid  
3. Structure  
4. Drain Pan  
5. Coil  
6. Damper  
7. Fan & Motor  

---

## 2. Peta diagram alur (referensi produk) → kode

Diagram internal: *INPUT → DATABASE & REFERENSI → SUB-COSTING ENGINE → BOM / agregasi → OUTPUT DOKUMEN*.

| Stage / kotak diagram | Implementasi di repo | Catatan |
|------------------------|----------------------|---------|
| Unit spec (H×W×D, casing, panel) | `CostingSegment.dimH/W/D`, `profileType`; `lib/calculations/framePanel.ts` | |
| Airflow & thermal (SA/RA, coil) | `body.coil` + `calculateCoil`; `body.damper.type` FA/RA | `flowCMH` belum mengikat kalkulasi. |
| Mechanical (fan, motor) | `body.fanMotor` + `lib/calculations/fanMotor.ts` | Lookup `ComponentCatalog`. |
| Accessories (filter, drain pan) | Drain pan: sebagian di `calculateStructure` (baris material); modul `calculateDrainPanCost` di `ahu-costing.ts` belum di-wire ke API | |
| Master komponen / material | `prisma.materialPrice`, `profileData`, `componentCatalog` | Dimuat penuh per request recalculate. |
| CoilCost (sheet Excel) | Logika coil di `lib/calculations/coil.ts` + parity Excel bertahap di `lib/calculations/ahu-costing.ts` | Bukan file Excel terpisah di runtime. |
| 1. AHU-Skid | `calculateSkid` | |
| 2. AHU-Frame & Panel | `calculateFramePanel` | |
| 3. AHU-Structure | `calculateStructure` | Termasuk beberapa baris terkait drain/support. |
| VolDamper FA & RA | `calculateDamper` (satu tipe per request) | Untuk FA + RA dalam satu “produk” perlu keputusan desain (dua panggilan atau dua section). |
| drainpan | Belum section sendiri di API | |
| AHU IU1 Master BOM | Agregasi: `CostingSection` per kategori → `segment.subtotal` → `project.totalHPP` / `totalSelling` | Nama “IU1” tidak dipakai di schema. |
| Quotation / internal costing | `syncQuotationItemsFromProject`, generator PDF/Excel | Harga unit kutipan mengikuti total proyek setelah rollup. |

---

## 3. Keputusan: Flow CMH (`segment.flowCMH`)

**Perilaku saat ini:** nilai disimpan di UI dan database, tetapi **route recalculate tidak membacanya** dan tidak meneruskannya ke fungsi kalkulasi manapun.

**Opsi ke depan (belum dipilih — menunggu mapping Excel / acc):**

| Opsi | Arti |
|------|------|
| **A — Masuk kalkulasi** | Setelah dipetakan ke sel/rumus di workbook (mis. CMH vs LPS), `flowCMH` (atau turunannya) di-pass ke modul coil/damper/fan sesuai parity. |
| **B — Metadata saja** | Tetap ditampilkan di UI/quotation sebagai spesifikasi, tanpa mengubah qty/harga sampai rumus Excel jelas. |

**Rekomendasi sementara:** anggap **opsi B** secara perilaku sampai ada baris Excel eksplisit yang diimplementasikan; **opsi A** diaktifkan per modul bersamaan dengan tes golden (`ahu-costing.test.ts`).

---

## 4. Referensi kode sumber kebenaran

- Handler: `app/api/projects/[id]/segments/[segmentId]/recalculate/route.ts`
- Store (body default kosong dari UI): `store/costingStore.ts` → `recalculateSegment`

Dokumen ini sejajar dengan Fase A; perubahan kontrak API setelah Fase B/C harus memperbarui bagian 1–3 di atas.
