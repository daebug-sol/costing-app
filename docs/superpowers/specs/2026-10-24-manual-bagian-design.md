# Editor item manual: bagian, sub-bagian, baris ringkas

Disetujui dae di thread "Rombak editor grup item costing" (2026-10-24).

## Masalah
- "Tambah baris" / "Tambah grup" tidak sesuai penamaan kita.
- Header grup memakai handle 6-titik lama; di mobile kolom nama kegencet sampai tinggal pil hitam dan "Su..." (teks Subtotal terpotong), tombol "Tambah baris" ikut berdesakan.
- Placeholder nama tidak membantu.
- Picker mengunci material yang sudah dipakai ("sudah ada"), padahal baut M6 bisa dipakai di beberapa bagian.
- Baris material di mobile terlalu boros: qty selebar layar, harga satuan dan subtotal di baris terpisah tanpa hubungan yang jelas.

## Framing
Struktur yang dimaksud adalah BOM bertingkat (sub-assembly), bukan activity-based costing. Biaya aktivitas (jam kerja/mesin) kalau nanti ada adalah lapisan terpisah.

## Keputusan
1. Nama: "Tambah material" (utama), "Tambah bagian" (sekunder), "Tambah sub-bagian" di dalam bagian.
2. Bagian bisa punya sub-bagian sampai 3 tingkat (`MANUAL_GROUP_MAX_DEPTH`). `ManualCostingGroup.parentId` (nullable, cascade).
3. `ManualCostingGroup.subtotal` tetap item milik bagian itu saja. Total bertingkat untuk tampilan dihitung di `lib/manual-group-tree.ts` dari subtotal yang tersimpan, jadi rollup segmen/proyek, penawaran dan dashboard tidak berubah dan tidak dobel. `lib/manual-costing-rollup.ts` tidak disentuh.
4. Header bagian: chevron + nama + total + menu ⋯ (Ganti nama, Tambah material, Tambah sub-bagian, Pindah ke atas/bawah, Hapus). Tanpa handle drag; urutan lewat menu.
5. Bagian baru langsung masuk mode ganti nama dengan placeholder "Mis. Alas meja" / "Mis. Kaki penyangga".
6. Picker tidak mengunci material; menampilkan "dipakai di N bagian". Baris material menampilkan "Total 20 pcs di 3 bagian" kalau dipakai lebih dari satu bagian.
7. Baris material mobile: nama + ⋯, lalu `[qty] satuan × harga satuan │ subtotal` dengan subtotal tebal. Desktop: grid Nama | Qty | Satuan | Harga satuan | Subtotal (garis pemisah, tebal) | ⋯.
8. Penawaran tetap diratakan: bagian diurutkan induk dulu lalu anaknya. Toggle "Rincian: Rata / Per bagian" adalah PR berikutnya.

## Pengujian
- Unit: `lib/manual-group-tree.test.ts` (pohon, total, urutan, batas tingkat, pemakaian material).
- API: POST bagian dengan `parentId` di tingkat 4 ditolak 400.
- UI: `tests/ui/editors.stateful.spec.ts` memakai label baru; screenshot desktop/mobile terang/gelap.
