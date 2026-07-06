import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — Costing App",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-10 prose prose-neutral dark:prose-invert">
      <h1>Kebijakan Privasi</h1>
      <p className="text-muted-foreground text-sm">
        Terakhir diperbarui: 3 Juli 2026
      </p>

      <p>
        Costing App (&quot;kami&quot;) menyediakan perangkat lunak B2B untuk
        perhitungan biaya AHU dan pengelolaan penawaran harga. Kebijakan ini
        menjelaskan bagaimana kami memproses data dalam layanan SaaS ini.
      </p>

      <h2>1. Data yang dikumpulkan</h2>
      <ul>
        <li>Data akun: nama, email, organisasi (melalui Clerk).</li>
        <li>Data bisnis: harga material, profil, komponen, proyek costing, dan quotation.</li>
        <li>Data teknis: log server, alamat IP, metadata perangkat (untuk keamanan dan diagnostik).</li>
      </ul>

      <h2>2. Tujuan pemrosesan</h2>
      <p>
        Data digunakan untuk menyediakan layanan, mengisolasi data antar
        organisasi (multi-tenant), mendukung operasi pelanggan, dan
        meningkatkan keamanan sistem.
      </p>

      <h2>3. Penyimpanan & lokasi</h2>
      <p>
        Data disimpan di database PostgreSQL yang di-host (mis. Neon) dan
        infrastruktur aplikasi (mis. Vercel). Lokasi region mengikuti
        konfigurasi deployment pelanggan enterprise.
      </p>

      <h2>4. Berbagi data</h2>
      <p>
        Kami tidak menjual data pelanggan. Sub-processor (Clerk, Vercel, Neon,
        Sentry) dipakai hanya untuk operasi layanan dan tunduk pada perjanjian
        pemrosesan data.
      </p>

      <h2>5. Hak pengguna</h2>
      <p>
        Admin organisasi dapat mengekspor data melalui API{" "}
        <code>/api/org/export</code> dan meminta penghapusan organisasi
        melalui <code>/api/org/delete</code>. Hubungi kami untuk permintaan
        tambahan terkait GDPR.
      </p>

      <h2>6. Kontak</h2>
      <p>
        Pertanyaan privasi:{" "}
        <a href="mailto:privacy@example.com">privacy@example.com</a>
      </p>

      <p>
        <Link href="/legal/terms">Syarat & Ketentuan</Link>
      </p>
    </article>
  );
}
