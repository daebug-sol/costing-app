---
name: skill-ringkas
description: Menyusun ringkasan akhir pekerjaan atau PR dalam Bahasa Indonesia yang mudah dipahami namun tetap menyebut fakta penting (modul, perilaku, cara cek, risiko). Dipakai ketika user meminta rangkuman sesi, status tugas, ringkasan singkat, atau jawaban read-only/Ask yang harus tetap informatif. Lampirkan skill ini saat perlu — tidak memakai rule always-on agar hemat token.
disable-model-invocation: true
---

# Ringkasan hasil pekerjaan (Bahasa Indonesia, ringkas)

## Read-only / Ask mode (tanpa rule terpisah)

- Saat **tidak boleh mengubah repo** (Ask / read-only): jawaban substantif dan ringkaman **tetap** pakai struktur di bawah; bahasa Indonesia jelas; sebut cara cek (perintah tes, path) — **jangan** mengusulkan edit file kecuali user pindah ke Agent.
- Skill ini **hanya** dimuat saat kamu lampirkan atau meminta eksplisit — tidak menambah token tiap pesan seperti `alwaysApply` rule.

## Kapan memakai skill ini

- User minta **rangkuman**, **hasil**, **apa yang sudah jadi**, atau **simpulan** setelah sesi coding / PR / investigasi.
- Pembaca ingin **paham cepat** tanpa baca diff penuh, tapi tetap butuh **fakta cek** (tes, perintah, file kunci).

## Gaya bahasa

- Bahasa **Indonesia**, kalimat jelas; jargon hanya jika perlu dan diringkas satu frasa.
- Ikuti register user: santai jika user santai; kalau formal, tetap formal.
- **Tetap informatif**: sebut area kode (folder/modul), perilaku aplikasi yang berubah, dan cara verifikasi singkat.

## Struktur output (ikuti urutan ini)

1. **Kalimat inti** — satu atau dua kalimat: apa selesai / masalah apa terselesaikan.
2. **Perubahan utama** — bullet pendek; fokus dampak, bukan daftar file tanpa konteks.
3. **Cara cek** — perintah tes atau langkah manual (hanya jika relevan di sesi itu).
4. **Catatan / risiko** — trade-off, perilaku yang berubah, hal yang sengaja tidak disentuh.
5. **Opsional** — satu baris untuk PR/commit jika membantu pelacakan.

## Larangan

- Ringkasan kosong: "sudah fix" tanpa menjelaskan **apa** dan **kenapa penting**.
- Klaim "semua tes hijau" tanpa bukti di sesi; gunakan "jalankan … untuk memastikan" jika belum dijalankan.
- Menempel diff atau blok kode panjang; cukup rujuk path atau nama fitur.

## Contoh output yang diinginkan (cuplikan)

```markdown
## Ringkasan
Hitungan damper diselaraskan ke model workbook VolDamper sehingga total app sama dengan sel S59 pada dump.

## Yang berubah
- Damper: sembilan baris biaya per sheet (FA/RA), geometri dari C43×P43.
- Frame: total frame dipatok ke O96; liner GI per muka; interpost lengkap sumbu D; clip/gasket mengikuti pola pent vs interpost.

## Cara cek
`npm test -- oracle-parity` dan `npm test -- lib/calculations`

## Catatan
Harga damper parity mengikuti snapshot katalog di kode, belum mengikuti harga material live di DB.
```

## Contoh yang kurang memadai

"Hanya update beberapa file, silakan cek." — tidak actionable dan tidak informatif.

## Panjang

- Sasaran: **pendek** (setengah layar atau kurang), kecuali user minta detail; kalau detail, tambah subjudul **Detail teknis** dengan bullet rapat.
