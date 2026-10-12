# Organisasi demo (data setahun untuk klien)

Seed `prisma/seed-demo.ts` membuat satu organisasi terpisah, **PT Sinar Dingin Nusantara (Demo)** (`org_demo_sinar_dingin`), berisi aktivitas 12 bulan terakhir. Data organisasi lain tidak pernah disentuh: semua tulis/hapus di-scope ke id organisasi itu.

## Isi data

- 5 sales dengan target bulanan (Rp 300 jt sampai Rp 800 jt), 28 pelanggan (RS, farmasi, hotel, mal, pabrik, data center, kampus).
- ~140 quotation (draft, terkirim, menang, kalah, digantikan revisi), pola musiman (puncak Jun-Jul dan Okt-Nov), ~165 proyek costing dengan item AHU dan manual.
- Sales order, surat jalan, invoice (DP / termin / pelunasan, ada yang lunas, sebagian, jatuh tempo, void) dan pembayaran, dengan pelanggan yang cepat dan lambat bayar.
- Katalog material, profil, dan komponen. Nomor dokumen memakai format app (`QT-YYYYMM-####`) dan urutannya dilanjutkan.
- Baris AHU memakai angka tetap (bukan hasil hitung ulang), jadi tombol **Hitung ulang** pada item AHU demo tidak dimaksudkan untuk dipakai.

## Menjalankan

```bash
npm run db:seed:demo              # hapus + buat ulang data bisnis demo (idempotent)
npm run db:seed:demo -- --reset   # hapus organisasi demo seluruhnya
```

Menjalankan ulang aman: data bisnis diganti, tetapi organisasi, anggota, dan peran yang sudah diatur tetap. **Jalankan ulang sehari sebelum presentasi** supaya tanggal "hari ini", jatuh tempo, dan tindak lanjut tetap segar.

Variabel opsional:

| Variabel | Fungsi |
| --- | --- |
| `DEMO_CLERK_ORG_ID` | id organisasi Clerk (`org_...`) yang dihubungkan ke organisasi demo |
| `DEMO_OWNER_USER_ID` | id user Clerk milik dae, dijadikan owner dan sales teratas |
| `DEMO_OWNER_NAME` | nama tampilan Clerk dae; dipakai sebagai nama sales teratas supaya dashboard personal terisi |
| `DEMO_VIEWER_USER_IDS` | id user Clerk klien (pisah koma), peran `ceo` (lihat semua, hanya baca) |
| `DEMO_ANCHOR` | tanggal "hari ini" untuk data (default hari ini) |

Pengaman: skrip menolak database selain localhost kecuali `DEMO_SEED_ALLOW_REMOTE=1`. Jangan set itu tanpa persetujuan, dan cadangkan database dulu.

## Memberi klien akses

Aplikasi memakai Clerk, dan data dipetakan lewat **organisasi Clerk**. Opsi paling sederhana adalah mengundang email klien ke organisasi Clerk demo:

1. Di Clerk Dashboard, buat organisasi (mis. "Demo Sinar Dingin") dan salin id-nya (`org_...`).
2. Jalankan seed dengan `DEMO_CLERK_ORG_ID`, `DEMO_OWNER_USER_ID`, dan `DEMO_OWNER_NAME` terisi (pertama kali ke database lokal, lalu ke produksi setelah ada persetujuan).
3. Di Clerk Dashboard, Organizations, Members, undang email klien. Klien membuka email undangan, mendaftar, lalu masuk. Jika klien hanya punya organisasi ini, organisasi aktif otomatis.
4. **Atur peran klien.** Anggota baru otomatis berperan `member`, yang hanya melihat data atas namanya sendiri sehingga dashboard tampak kosong. Setelah klien login sekali, ubah perannya di Pengaturan, Anggota: `ceo` (lihat semua data, hanya baca, paling aman) atau `admin` (boleh mengubah data; jalankan ulang seed untuk mengembalikan data). Alternatif tanpa langkah manual: isi `DEMO_VIEWER_USER_IDS` dengan id user klien (terlihat di Clerk Dashboard, Users) lalu jalankan seed ulang.

Alternatif: satu akun login bersama yang hanya menjadi anggota organisasi demo. Lebih cepat, tetapi kredensial dibagi dan tidak ada jejak per orang, jadi disarankan hanya untuk demo singkat.
