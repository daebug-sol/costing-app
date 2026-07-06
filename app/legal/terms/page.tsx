import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — Costing App",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-10 prose prose-neutral dark:prose-invert">
      <h1>Syarat & Ketentuan Layanan</h1>
      <p className="text-muted-foreground text-sm">
        Terakhir diperbarui: 3 Juli 2026
      </p>

      <p>
        Dengan mengakses Costing App, Anda setuju pada syarat berikut untuk
        penggunaan layanan B2B berbasis undangan (invite-only).
      </p>

      <h2>1. Layanan</h2>
      <p>
        Costing App adalah perangkat lunak untuk estimasi biaya AHU, database
        harga, dan pembuatan quotation. Fitur dan ketersediaan dapat berubah
        dengan pemberitahuan wajar.
      </p>

      <h2>2. Akun & organisasi</h2>
      <p>
        Akses diberikan per organisasi. Admin organisasi bertanggung jawab
        atas pengguna yang diundang dan aktivitas di bawah akun organisasi
        tersebut.
      </p>

      <h2>3. Data pelanggan</h2>
      <p>
        Anda mempertahankan kepemilikan atas data bisnis yang diunggah. Kami
        memproses data hanya untuk menyediakan layanan dan menjaga isolasi
        antar tenant.
      </p>

      <h2>4. Penggunaan yang dilarang</h2>
      <ul>
        <li>Mencoba mengakses data organisasi lain.</li>
        <li>Reverse engineering atau penggunaan yang melanggar hukum.</li>
        <li>Beban berlebihan yang mengganggu stabilitas layanan.</li>
      </ul>

      <h2>5. Ketersediaan & batasan tanggung jawab</h2>
      <p>
        Layanan disediakan &quot;sebagaimana adanya&quot;. Estimasi biaya
        bersifat pendukung keputusan bisnis; validasi akhir tetap menjadi
        tanggung jawab pengguna. Kami tidak bertanggung jawab atas kerugian
        tidak langsung akibat penggunaan perangkat lunak.
      </p>

      <h2>6. Pengakhiran</h2>
      <p>
        Kami dapat menangguhkan akses jika terjadi pelanggaran syarat atau
        risiko keamanan. Data dapat diekspor sebelum penghapusan organisasi.
      </p>

      <h2>7. Hukum yang berlaku</h2>
      <p>Hukum Republik Indonesia, dengan yurisdiksi pengadilan di Jakarta.</p>

      <p>
        <Link href="/legal/privacy">Kebijakan Privasi</Link>
      </p>
    </article>
  );
}
