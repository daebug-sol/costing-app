/** Static fixtures for the demo organization seed (see prisma/seed-demo.ts). */

export const DEMO_ORG_ID = "org_demo_sinar_dingin";
export const DEMO_ORG_SLUG = "demo-sinar-dingin";
export const DEMO_ORG_NAME = "PT Sinar Dingin Nusantara (Demo)";

export type Payer = "fast" | "normal" | "slow";

export type SalesPerson = {
  slug: string;
  name: string;
  /** Monthly target in IDR. */
  target: number;
  /** Share of new quotations. */
  weight: number;
  /** Per-month multiplier on activity: <0 declining, >0 growing. */
  trend: number;
  /** Probability a decided quotation is won. */
  winRate: number;
};

export const SALES: SalesPerson[] = [
  { slug: "rina", name: "Rina Kusuma", target: 800_000_000, weight: 0.23, trend: 0.01, winRate: 0.5 },
  { slug: "budi", name: "Budi Santoso", target: 450_000_000, weight: 0.23, trend: 0.0, winRate: 0.46 },
  { slug: "dewi", name: "Dewi Lestari", target: 400_000_000, weight: 0.21, trend: 0.05, winRate: 0.44 },
  { slug: "agus", name: "Agus Prasetyo", target: 350_000_000, weight: 0.19, trend: -0.03, winRate: 0.4 },
  { slug: "siti", name: "Siti Rahmawati", target: 300_000_000, weight: 0.14, trend: 0.02, winRate: 0.46 },
];

/** Calendar-month demand (Jan..Dec): slow start of year, mid-year and year-end budget peaks. */
export const SEASONALITY = [0.6, 0.7, 0.85, 0.9, 0.95, 1.1, 1.2, 1.1, 1.0, 1.3, 1.45, 1.1];

export type Sector = "rs" | "farmasi" | "hotel" | "mall" | "pabrik" | "dc" | "kampus" | "pangan";

export type CustomerSeed = {
  company: string;
  sector: Sector;
  city: string;
  street: string;
  attn: string;
  slug: string;
  payer: Payer;
  /** Index into SALES that normally handles this customer. */
  owner: number;
};

export const CUSTOMERS: CustomerSeed[] = [
  { company: "RS Harapan Bunda", sector: "rs", city: "Jakarta Selatan", street: "Jl. TB Simatupang No. 18", attn: "Ir. Hendra Wijaya", slug: "harapanbunda", payer: "normal", owner: 0 },
  { company: "RS Mitra Sehat Sejahtera", sector: "rs", city: "Bekasi", street: "Jl. Ahmad Yani No. 112", attn: "dr. Maria Susanti", slug: "mitrasehat", payer: "slow", owner: 1 },
  { company: "RSU Permata Medika", sector: "rs", city: "Tangerang", street: "Jl. Boulevard Gading Serpong Blok B2", attn: "Yusuf Ramadhan, ST", slug: "permatamedika", payer: "normal", owner: 2 },
  { company: "RS Citra Husada", sector: "rs", city: "Surabaya", street: "Jl. Darmo Permai Selatan No. 7", attn: "Linda Gunawan", slug: "citrahusada", payer: "fast", owner: 3 },
  { company: "PT Farmasi Sentosa Medika", sector: "farmasi", city: "Cikarang", street: "Kawasan Industri Jababeka Blok F-12", attn: "Andri Setiawan", slug: "farmasisentosa", payer: "fast", owner: 0 },
  { company: "PT Biofarma Nusantara Raya", sector: "farmasi", city: "Bandung", street: "Jl. Industri Cimahi No. 45", attn: "Ratna Dewanti, Apt.", slug: "biofarmanusantara", payer: "normal", owner: 0 },
  { company: "PT Kimia Sehat Abadi", sector: "farmasi", city: "Karawang", street: "KIIC Jl. Permata Raya Lot C-9", attn: "Bambang Hartono", slug: "kimiasehat", payer: "normal", owner: 4 },
  { company: "Hotel Grand Nusantara", sector: "hotel", city: "Jakarta Pusat", street: "Jl. MH Thamrin No. 51", attn: "Eko Prabowo", slug: "grandnusantara", payer: "normal", owner: 1 },
  { company: "Hotel Samudra Bali Resort", sector: "hotel", city: "Badung, Bali", street: "Jl. Pantai Kuta No. 200", attn: "I Made Wirawan", slug: "samudrabali", payer: "slow", owner: 2 },
  { company: "Hotel Kencana Surabaya", sector: "hotel", city: "Surabaya", street: "Jl. Basuki Rahmat No. 88", attn: "Fitriani Handayani", slug: "kencanasby", payer: "fast", owner: 3 },
  { company: "Metropolitan Mall Bekasi", sector: "mall", city: "Bekasi", street: "Jl. KH Noer Ali No. 1", attn: "Teguh Santosa", slug: "metromallbekasi", payer: "normal", owner: 1 },
  { company: "Pusat Perbelanjaan Cahaya Medan", sector: "mall", city: "Medan", street: "Jl. Gatot Subroto No. 155", attn: "Rizky Pratama Siregar", slug: "cahayamedan", payer: "slow", owner: 4 },
  { company: "Plaza Indah Semarang", sector: "mall", city: "Semarang", street: "Jl. Pemuda No. 118", attn: "Anita Wulandari", slug: "plazaindah", payer: "normal", owner: 3 },
  { company: "PT Elektronik Cipta Persada", sector: "pabrik", city: "Cikarang", street: "Kawasan MM2100 Blok D-3", attn: "Hendro Kusumo", slug: "elektronikcipta", payer: "fast", owner: 0 },
  { company: "PT Otomotif Prima Komponen", sector: "pabrik", city: "Karawang", street: "Jl. Surya Utama Kav. A-14", attn: "Joko Susilo", slug: "otomotifprima", payer: "normal", owner: 1 },
  { company: "PT Tekstil Karya Mulya", sector: "pabrik", city: "Bandung", street: "Jl. Soekarno-Hatta No. 620", attn: "Sri Mulyani", slug: "tekstilkarya", payer: "slow", owner: 3 },
  { company: "PT Plastik Mandiri Jaya", sector: "pabrik", city: "Tangerang", street: "Jl. Industri Raya Blok K-7", attn: "Wahyu Nugroho", slug: "plastikmandiri", payer: "normal", owner: 2 },
  { company: "PT Kemasan Surya Lestari", sector: "pabrik", city: "Sidoarjo", street: "Jl. Raya Waru KM 3", attn: "Dian Anggraini", slug: "kemasansurya", payer: "normal", owner: 2 },
  { company: "PT Pangan Makmur Abadi", sector: "pangan", city: "Bekasi", street: "Jl. Raya Cibitung Km 5", attn: "Slamet Riyadi", slug: "panganmakmur", payer: "fast", owner: 4 },
  { company: "PT Boga Nusantara Sejahtera", sector: "pangan", city: "Makassar", street: "Kawasan Industri Makassar (KIMA) Kav. 22", attn: "Andi Mappanyukki", slug: "boganusantara", payer: "normal", owner: 2 },
  { company: "PT Cold Chain Logistik Indonesia", sector: "pangan", city: "Jakarta Utara", street: "Jl. Cakung Cilincing Raya No. 33", attn: "Maulana Ibrahim", slug: "coldchain", payer: "normal", owner: 0 },
  { company: "Nusa Digital Data Center", sector: "dc", city: "Jakarta Barat", street: "Jl. Daan Mogot Km 11", attn: "Kevin Alexander", slug: "nusadigital", payer: "fast", owner: 0 },
  { company: "PT Pusat Data Garuda", sector: "dc", city: "Cikarang", street: "Greenland International Industrial Center Blok A-2", attn: "Ferry Gunadi", slug: "datagaruda", payer: "fast", owner: 1 },
  { company: "Universitas Bina Teknologi", sector: "kampus", city: "Depok", street: "Jl. Margonda Raya No. 300", attn: "Prof. Dr. Ir. Sutrisno", slug: "binateknologi", payer: "slow", owner: 4 },
  { company: "Institut Sains Nusantara", sector: "kampus", city: "Yogyakarta", street: "Jl. Kaliurang Km 7", attn: "Dra. Endang Lestari", slug: "sainsnusantara", payer: "slow", owner: 2 },
  { company: "PT Kontraktor Mekanikal Utama", sector: "pabrik", city: "Jakarta Selatan", street: "Jl. Pasar Minggu Raya No. 14", attn: "Ahmad Fauzi", slug: "kontraktormu", payer: "normal", owner: 1 },
  { company: "PT Bangun Cipta Konsultan", sector: "pabrik", city: "Jakarta Selatan", street: "Jl. Cilandak KKO No. 9", attn: "Rudi Hartanto", slug: "bangunciptak", payer: "normal", owner: 3 },
  { company: "RS Ibu dan Anak Kasih Ibu", sector: "rs", city: "Depok", street: "Jl. Raya Sawangan No. 61", attn: "dr. Sari Wulandari", slug: "kasihibu", payer: "normal", owner: 4 },
];

type ScopeTemplate = { ahu: string[]; manual: string[] };

/** Project name fragments per sector (picked at random). */
export const SCOPES: Record<Sector, ScopeTemplate> = {
  rs: {
    ahu: ["AHU Ruang Operasi", "AHU Ruang ICU", "AHU Poliklinik", "AHU Ruang Isolasi", "AHU Laboratorium"],
    manual: ["Ducting Gedung Rawat Inap", "Piping Chilled Water Lt. 2", "Panel Kontrol HVAC Rawat Jalan"],
  },
  farmasi: {
    ahu: ["AHU Cleanroom Produksi", "AHU Ruang Steril", "AHU Gudang Bahan Baku", "AHU Area Packaging"],
    manual: ["Ducting Cleanroom Grade C", "Panel Kontrol Cleanroom", "Piping Chilled Water Produksi"],
  },
  hotel: {
    ahu: ["AHU Lobby dan Ballroom", "AHU Restoran", "AHU Area Fasilitas Kolam", "FAU Koridor Kamar"],
    manual: ["Ducting Koridor Kamar", "Piping Chilled Water Tower B", "Panel Kontrol Ballroom"],
  },
  mall: {
    ahu: ["AHU Atrium", "AHU Foodcourt", "AHU Area Anchor Tenant", "AHU Area Bioskop"],
    manual: ["Ducting Area Tenant Lt. 3", "Piping Chilled Water Basement", "Panel BMS Gedung"],
  },
  pabrik: {
    ahu: ["AHU Area Produksi", "AHU Ruang Assembly", "AHU Ruang Kontrol", "AHU Ruang Kalibrasi"],
    manual: ["Ducting Area Produksi", "Piping Chilled Water Pabrik", "Panel Kontrol Utilitas"],
  },
  dc: {
    ahu: ["CRAH Data Hall 1", "AHU Ruang UPS", "AHU Ruang Baterai", "CRAH Data Hall 2"],
    manual: ["Piping Chilled Water Data Hall", "Panel Kontrol Precision Cooling", "Ducting Ruang Kontrol"],
  },
  kampus: {
    ahu: ["AHU Auditorium", "AHU Perpustakaan", "AHU Laboratorium Teknik", "AHU Ruang Kuliah Umum"],
    manual: ["Ducting Gedung Rektorat", "Piping Chilled Water Gedung Baru", "Panel Kontrol HVAC Kampus"],
  },
  pangan: {
    ahu: ["AHU Ruang Proses", "AHU Cold Storage", "AHU Area Pengemasan", "AHU Ruang Chiller"],
    manual: ["Ducting Area Pengolahan", "Piping Refrigerant Cold Room", "Panel Kontrol Cold Chain"],
  },
};

export const AHU_MODELS = [
  { model: "AHU-X2-050-H2-H", flow: [4_000, 8_000] },
  { model: "AHU-X3-075-H3-H", flow: [7_000, 12_000] },
  { model: "AHU-X4-100-H3-V", flow: [10_000, 16_000] },
  { model: "AHU-X4-150-H4-V", flow: [14_000, 22_000] },
  { model: "AHU-X5-200-H4-H", flow: [20_000, 32_000] },
] as const;

/** AHU cost structure: share of segment HPP and typical line items per category. */
export const AHU_SECTIONS: Array<{
  category: string;
  share: number;
  lines: Array<{ description: string; uom: string }>;
}> = [
  { category: "Frame & Panel", share: 0.22, lines: [{ description: "Rangka aluminium extrusion", uom: "m" }, { description: "Panel sandwich PU 50mm", uom: "m2" }, { description: "Corner dan gasket", uom: "set" }] },
  { category: "Skid", share: 0.05, lines: [{ description: "Base frame skid baja", uom: "kg" }] },
  { category: "Structure", share: 0.06, lines: [{ description: "Penguat struktur dan bracket", uom: "kg" }] },
  { category: "Drain Pan", share: 0.04, lines: [{ description: "Drain pan SUS304 1.2mm", uom: "kg" }, { description: "Fitting drain", uom: "pcs" }] },
  { category: "Access Door", share: 0.03, lines: [{ description: "Pintu akses 600x1600 dengan engsel", uom: "pcs" }] },
  { category: "Filters", share: 0.07, lines: [{ description: "Pre-filter G4", uom: "pcs" }, { description: "Bag filter F7", uom: "pcs" }] },
  { category: "Coil", share: 0.28, lines: [{ description: "Cooling coil 6 row copper-alu fin", uom: "set" }, { description: "Header dan fitting coil", uom: "set" }] },
  { category: "Damper", share: 0.05, lines: [{ description: "Volume damper opposed blade", uom: "pcs" }] },
  { category: "Fan & Motor", share: 0.2, lines: [{ description: "Plug fan dengan impeller backward curved", uom: "unit" }, { description: "Motor IE3 dan VFD", uom: "set" }] },
];

export const MATERIALS = [
  { code: "SGCC-0.8", name: "SGCC (GI) 0.8mm", category: "Sheet Metal", density: 7850, pricePerKg: 21_500 },
  { code: "SGCC-1.0", name: "SGCC (GI) 1.0mm", category: "Sheet Metal", density: 7850, pricePerKg: 22_000 },
  { code: "SUS304-1.2", name: "SUS304 Stainless 1.2mm", category: "Sheet Metal", density: 7930, pricePerKg: 68_000 },
  { code: "AL-1.0", name: "Aluminium sheet 1.0mm", category: "Sheet Metal", density: 2700, pricePerKg: 58_000 },
  { code: "MS-3.0", name: "Pelat besi hitam 3mm", category: "Steel", density: 7850, pricePerKg: 14_500 },
  { code: "CU-TUBE", name: "Pipa tembaga 3/8 inci", category: "Copper", density: 8960, pricePerKg: 142_000 },
  { code: "GW-50", name: "Glasswool 50mm", category: "Insulation", density: 24, pricePerKg: 38_000 },
  { code: "PU-FOAM", name: "Busa PU insulasi", category: "Insulation", density: 40, pricePerKg: 46_000 },
] as const;

export const PROFILES = [
  { code: "AL-40x40", name: "Aluminium profile 40x40", type: "Aluminium", weightPerM: 0.9, pricePerM: 48_000, panelThick: 50 },
  { code: "AL-40x80", name: "Aluminium profile 40x80", type: "Aluminium", weightPerM: 1.5, pricePerM: 92_000, panelThick: 50 },
  { code: "AL-CORNER-50", name: "Aluminium corner 50mm", type: "Aluminium", weightPerM: 0.4, pricePerM: 31_000, panelThick: 50 },
  { code: "GI-C75", name: "GI C-channel 75mm", type: "Steel", weightPerM: 2.1, pricePerM: 36_000, panelThick: null },
  { code: "AL-40x40-25", name: "Aluminium profile 40x40 (panel 25mm)", type: "Aluminium", weightPerM: 0.8, pricePerM: 44_000, panelThick: 25 },
] as const;

export const COMPONENTS = [
  { code: "FAN-EC-450", name: "Plug fan EC 450mm", category: "Fan", unitPrice: 14_500_000, unit: "unit", supplier: "PT Mitra Fan Indonesia" },
  { code: "MOT-5.5", name: "Motor listrik IE3 5.5 kW", category: "Motor", unitPrice: 6_200_000, unit: "unit", supplier: "PT Elektro Mesin Jaya" },
  { code: "MOT-7.5", name: "Motor listrik IE3 7.5 kW", category: "Motor", unitPrice: 8_400_000, unit: "unit", supplier: "PT Elektro Mesin Jaya" },
  { code: "MOT-11", name: "Motor listrik IE3 11 kW", category: "Motor", unitPrice: 12_500_000, unit: "unit", supplier: "PT Elektro Mesin Jaya" },
  { code: "VFD-7.5", name: "Inverter VFD 7.5 kW", category: "Electrical", unitPrice: 9_800_000, unit: "unit", supplier: "PT Daya Kontrol" },
  { code: "COIL-6R", name: "Cooling coil 6 row", category: "Coil", unitPrice: 38_000_000, unit: "set", supplier: "PT Penukar Panas Nusantara" },
  { code: "VLV-2W-50", name: "Valve 2-way DN50 motorized", category: "Valve", unitPrice: 4_200_000, unit: "pcs", supplier: "PT Daya Kontrol" },
  { code: "VLV-GATE-80", name: "Gate valve DN80", category: "Valve", unitPrice: 1_900_000, unit: "pcs", supplier: "PT Katup Mandiri" },
  { code: "FLT-G4", name: "Pre-filter G4", category: "Filter", unitPrice: 420_000, unit: "pcs", supplier: "PT Filter Udara Prima" },
  { code: "FLT-F7", name: "Bag filter F7", category: "Filter", unitPrice: 1_600_000, unit: "pcs", supplier: "PT Filter Udara Prima" },
  { code: "FLT-H13", name: "HEPA filter H13", category: "Filter", unitPrice: 5_800_000, unit: "pcs", supplier: "PT Filter Udara Prima" },
  { code: "DMP-VOL", name: "Volume damper 800x500", category: "Damper", unitPrice: 2_100_000, unit: "pcs", supplier: "PT Damper Teknik" },
  { code: "FLEX-CONN", name: "Flexible connection canvas", category: "Ducting", unitPrice: 380_000, unit: "m", supplier: "PT Damper Teknik" },
  { code: "DIFF-600", name: "Diffuser 600x600", category: "Ducting", unitPrice: 650_000, unit: "pcs", supplier: "PT Damper Teknik" },
  { code: "PIPE-DN50", name: "Pipa black steel Sch40 DN50", category: "Piping", unitPrice: 210_000, unit: "m", supplier: "PT Baja Pipa Utama" },
  { code: "PIPE-DN80", name: "Pipa black steel Sch40 DN80", category: "Piping", unitPrice: 340_000, unit: "m", supplier: "PT Baja Pipa Utama" },
  { code: "INS-PIPE", name: "Insulasi pipa elastomerik 19mm", category: "Piping", unitPrice: 95_000, unit: "m", supplier: "PT Insulasi Nusa" },
  { code: "PNL-MCC", name: "Panel MCC outdoor", category: "Electrical", unitPrice: 45_000_000, unit: "pcs", supplier: "PT Panel Elektrik Mandiri" },
  { code: "SNS-TEMP", name: "Sensor suhu dan kelembapan", category: "Control", unitPrice: 2_400_000, unit: "pcs", supplier: "PT Daya Kontrol" },
  { code: "BMS-CTRL", name: "Kontroler BMS DDC", category: "Control", unitPrice: 28_000_000, unit: "pcs", supplier: "PT Daya Kontrol" },
  { code: "SVC-DUCT", name: "Jasa pemasangan ducting", category: "Jasa", unitPrice: 185_000, unit: "m2", supplier: null },
  { code: "SVC-PIPE", name: "Jasa instalasi piping", category: "Jasa", unitPrice: 95_000, unit: "m", supplier: null },
  { code: "SVC-COMM", name: "Jasa wiring dan commissioning", category: "Jasa", unitPrice: 18_500_000, unit: "lot", supplier: null },
] as const;

type Source = { type: "material" | "component"; code: string };

/** Manual package recipes: groups of (source, base quantity, waste). */
export const MANUAL_RECIPES: Array<{
  key: "ducting" | "piping" | "panel";
  title: string;
  groups: Array<{ name: string; items: Array<Source & { qty: number; waste?: number }> }>;
}> = [
  {
    key: "ducting",
    title: "Ducting dan Aksesori",
    groups: [
      { name: "Material ducting", items: [
        { type: "material", code: "SGCC-0.8", qty: 3200, waste: 1.12 },
        { type: "material", code: "SGCC-1.0", qty: 1400, waste: 1.1 },
        { type: "material", code: "GW-50", qty: 260, waste: 1.05 },
      ] },
      { name: "Aksesori", items: [
        { type: "component", code: "DMP-VOL", qty: 14 },
        { type: "component", code: "FLEX-CONN", qty: 36 },
        { type: "component", code: "DIFF-600", qty: 48 },
      ] },
      { name: "Jasa", items: [{ type: "component", code: "SVC-DUCT", qty: 420 }] },
    ],
  },
  {
    key: "piping",
    title: "Piping Chilled Water",
    groups: [
      { name: "Pipa dan insulasi", items: [
        { type: "component", code: "PIPE-DN80", qty: 160, waste: 1.05 },
        { type: "component", code: "PIPE-DN50", qty: 220, waste: 1.05 },
        { type: "component", code: "INS-PIPE", qty: 380, waste: 1.05 },
      ] },
      { name: "Valve", items: [
        { type: "component", code: "VLV-GATE-80", qty: 12 },
        { type: "component", code: "VLV-2W-50", qty: 8 },
      ] },
      { name: "Jasa", items: [{ type: "component", code: "SVC-PIPE", qty: 380 }] },
    ],
  },
  {
    key: "panel",
    title: "Panel Kontrol dan BMS",
    groups: [
      { name: "Panel dan drive", items: [
        { type: "component", code: "PNL-MCC", qty: 2 },
        { type: "component", code: "VFD-7.5", qty: 4 },
      ] },
      { name: "Kontrol", items: [
        { type: "component", code: "BMS-CTRL", qty: 2 },
        { type: "component", code: "SNS-TEMP", qty: 16 },
      ] },
      { name: "Jasa", items: [{ type: "component", code: "SVC-COMM", qty: 1 }] },
    ],
  },
];

export const LOST_REASONS = [
  "Harga lebih tinggi dari kompetitor",
  "Proyek ditunda oleh klien",
  "Anggaran klien dipotong",
  "Spesifikasi berubah, klien memilih vendor lain",
  "Klien memilih produk impor",
  "Tidak ada kabar setelah negosiasi",
];

export const PAYMENT_TERMS = [
  "DP 50%, balance CBD",
  "DP 30%, progress 40%, pelunasan 30%",
  "DP 50%, balance 30 hari setelah pengiriman",
];

export const FIRST_NAMES = ["Andi", "Bagus", "Citra", "Dimas", "Eka", "Fajar", "Gita", "Hana", "Irfan", "Joko"];
export const LAST_NAMES = ["Saputra", "Wijaya", "Hidayat", "Nugraha", "Permana", "Maharani", "Kurniawan"];
