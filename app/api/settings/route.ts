import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getOrCreateSettings() {
  let settings = await prisma.appSettings.findUnique({
    where: { id: "default" },
  });
  if (!settings) {
    settings = await prisma.appSettings.findFirst();
  }
  if (!settings) {
    settings = await prisma.appSettings.create({
      data: {
        id: "default",
        companyName: "PT Thermal True Indonesia",
      },
    });
  }
  return settings;
}

export async function GET() {
  try {
    const settings = await getOrCreateSettings();
    return NextResponse.json(settings);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const settings = await getOrCreateSettings();

    const data: {
      forexUSD?: number;
      forexEUR?: number;
      forexRM?: number;
      forexSGD?: number;
      companyName?: string;
      companyAddress?: string;
      companyPhone?: string;
      companyEmail?: string;
      companyLogo?: string | null;
      presetSignedByName?: string;
      presetCheckedByName?: string;
      presetApprovedByName?: string;
      presetTtdPrepared?: string | null;
      presetTtdReviewed?: string | null;
      presetTtdApproved?: string | null;
      defaultOverhead?: number;
      defaultContingency?: number;
      defaultMargin?: number;
      defaultEskalasi?: number;
      defaultAsuransi?: number;
      defaultMobilisasi?: number;
      ppnRate?: number;
      paymentTerms?: string;
      deliveryTerms?: string;
      warrantyTerms?: string;
      validityDays?: number;
      termsConditions?: string;
    } = {};

    const takeNum = (v: unknown): number | undefined => {
      if (v === undefined) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const n = takeNum(body.forexUSD);
    if (n !== undefined) data.forexUSD = n;
    const e = takeNum(body.forexEUR);
    if (e !== undefined) data.forexEUR = e;
    const r = takeNum(body.forexRM);
    if (r !== undefined) data.forexRM = r;
    const s = takeNum(body.forexSGD);
    if (s !== undefined) data.forexSGD = s;

    const oh = takeNum(body.defaultOverhead);
    if (oh !== undefined) data.defaultOverhead = oh;
    const ct = takeNum(body.defaultContingency);
    if (ct !== undefined) data.defaultContingency = ct;
    const mg = takeNum(body.defaultMargin);
    if (mg !== undefined) data.defaultMargin = mg;
    const es = takeNum(body.defaultEskalasi);
    if (es !== undefined) data.defaultEskalasi = es;
    const as = takeNum(body.defaultAsuransi);
    if (as !== undefined) data.defaultAsuransi = as;
    const mb = takeNum(body.defaultMobilisasi);
    if (mb !== undefined) data.defaultMobilisasi = mb;
    const ppn = takeNum(body.ppnRate);
    if (ppn !== undefined) data.ppnRate = ppn;
    const vd = takeNum(body.validityDays);
    if (vd !== undefined) data.validityDays = Math.round(vd);

    if (body.companyName !== undefined)
      data.companyName = String(body.companyName);
    if (body.companyAddress !== undefined)
      data.companyAddress = String(body.companyAddress);
    if (body.companyPhone !== undefined)
      data.companyPhone = String(body.companyPhone);
    if (body.companyEmail !== undefined)
      data.companyEmail = String(body.companyEmail);
    if (body.companyLogo !== undefined)
      data.companyLogo =
        body.companyLogo === null || body.companyLogo === ""
          ? null
          : String(body.companyLogo);
    if (body.presetSignedByName !== undefined)
      data.presetSignedByName = String(body.presetSignedByName);
    if (body.presetCheckedByName !== undefined)
      data.presetCheckedByName = String(body.presetCheckedByName);
    if (body.presetApprovedByName !== undefined)
      data.presetApprovedByName = String(body.presetApprovedByName);
    if (body.presetTtdPrepared !== undefined)
      data.presetTtdPrepared =
        body.presetTtdPrepared === null || body.presetTtdPrepared === ""
          ? null
          : String(body.presetTtdPrepared);
    if (body.presetTtdReviewed !== undefined)
      data.presetTtdReviewed =
        body.presetTtdReviewed === null || body.presetTtdReviewed === ""
          ? null
          : String(body.presetTtdReviewed);
    if (body.presetTtdApproved !== undefined)
      data.presetTtdApproved =
        body.presetTtdApproved === null || body.presetTtdApproved === ""
          ? null
          : String(body.presetTtdApproved);
    if (body.paymentTerms !== undefined)
      data.paymentTerms = String(body.paymentTerms);
    if (body.deliveryTerms !== undefined)
      data.deliveryTerms = String(body.deliveryTerms);
    if (body.warrantyTerms !== undefined)
      data.warrantyTerms = String(body.warrantyTerms);
    if (body.termsConditions !== undefined)
      data.termsConditions = String(body.termsConditions);

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.appSettings.update({
      where: { id: settings.id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
