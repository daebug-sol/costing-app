# Demo trial dengan kode aktivasi

Tujuan: klien baru mendaftar, tidak langsung masuk ke aplikasi, melainkan meminta atau memasukkan kode aktivasi, lalu mendapat organisasi demo 30 hari yang terisolasi untuk mencoba alur lengkap sampai dokumen jadi.

## Keputusan (dae, 2026-10-21)

- Persetujuan dan pengiriman kode **manual** oleh operator (dae), dengan pemberitahuan email ke dae saat ada permintaan demo.
- Setelah demo berakhir, klien yang lanjut **diubah ke akun berbayar secara manual** oleh operator (plan `standard`). Tidak ada penagihan di dalam aplikasi.
- Satu organisasi per klien. Tidak ada organisasi demo bersama.

## Alur

1. Klien daftar lewat Clerk. Pengguna yang belum punya organisasi aktif dialihkan ke `/activate` (dicek di `proxy.ts`, tanpa akses DB).
2. `/activate` menawarkan "Masukkan kode" dan "Minta demo". Form minta demo (nama, perusahaan, WA) menyimpan `DemoRequest` dan mengirim email ke operator.
3. Operator membuka `/operator`, melihat permintaan, lalu membuat kode untuk email klien (masa berlaku kode 7 hari, masa demo 30 hari, opsi data contoh). Kode ditampilkan sekali dan, bila email dikonfigurasi, dikirim ke klien.
4. Klien memasukkan kode di `/activate`. Server memeriksa kode (hash, belum dipakai, belum kedaluwarsa, email sama dengan email akun), membuat organisasi Clerk, baris `Organization` dengan plan `trial` dan `trialEndsAt`, dan anggota berperan `owner`.
5. Klien masuk ke aplikasi dengan organisasi demo.

## Masa aktif

- `Organization.trialEndsAt`. Selama demo, batas pemakaian lebih longgar daripada Free (30 proyek, 30 quotation).
- Setelah lewat: semua API selain ekspor data ditolak dengan `TRIAL_EXPIRED`, dan halaman dialihkan ke `/demo-berakhir` (hubungi kami, unduh data). Data disimpan, penghapusan dilakukan operator.
- Operator dapat memperpanjang (ubah `trialEndsAt`) atau mengubah plan ke `standard`.

## Isolasi

- Pengaman tenant yang ada (`organizationId` di setiap query, tes isolasi) tetap berlaku. Tidak ada jalur baru yang membaca lintas organisasi kecuali route `operator`.
- Kode disimpan sebagai hash SHA-256, sekali pakai, terikat email, dan pengecekan kode dibatasi rate limit.
- Hanya `OPERATOR_USER_IDS` atau `OPERATOR_API_KEY` yang bisa membuat kode atau melihat permintaan.

## Data contoh (PR 2)

Seed demo diubah agar menerima organisasi tujuan dan bisa dipanggil dari aplikasi: dipilih saat aktivasi (`withDemoData` pada kode) dan lewat tombol "Reset demo" di Pengaturan untuk berpindah antara data contoh dan kosong. Hanya untuk organisasi dengan plan `trial`.

## Pembagian PR

1. Gerbang kode, permintaan demo, masa aktif, halaman berakhir, konsol operator.
2. Seed demo per organisasi dan tombol Reset demo.

## Prasyarat di luar kode

- Clerk instance production sebelum klien sungguhan memakainya.
- Clerk: matikan pembuatan organisasi oleh pengguna, supaya pendaftar tidak melewati gerbang dengan membuat organisasi sendiri.
- Env baru: `RESEND_API_KEY`, `MAIL_FROM`, `OPERATOR_NOTIFY_EMAIL` (opsional; tanpa itu permintaan tetap tersimpan dan terlihat di konsol operator).
