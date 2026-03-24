import type { CalcLineItem, MaterialPrice, ProfileData } from "./types";
import {
  finite,
  findMaterial,
  findProfileByCode,
  firstProfileByType,
} from "./types";

const GI_CODE = "SGCC-1.0";
const FOAM_CODE = "PU-FOAM";
const GI_THICKNESS_M = 0.001;
const LINER_WASTE = 1.05;

function line(
  partial: Omit<CalcLineItem, "currency" | "wasteFactor" | "subtotal"> & {
    currency?: string;
    wasteFactor?: number;
  }
): CalcLineItem {
  const currency = partial.currency ?? "IDR";
  const wasteFactor = finite(partial.wasteFactor, 1);
  const qty = finite(partial.qty, 0);
  const unitPrice = finite(partial.unitPrice, 0);
  const subtotal = finite(qty * unitPrice * wasteFactor, 0);
  return {
    description: partial.description,
    uom: partial.uom,
    qty,
    qtyFormula: partial.qtyFormula ?? String(qty),
    unitPrice,
    currency,
    wasteFactor,
    subtotal,
    componentRef: partial.componentRef ?? null,
    notes: partial.notes ?? null,
  };
}

export function calculateFramePanel(params: {
  H: number;
  W: number;
  D: number;
  profileType: string;
  nSections: number;
  profiles: ProfileData[];
  materials: MaterialPrice[];
}): CalcLineItem[] {
  const H = finite(params.H, 0);
  const W = finite(params.W, 0);
  const D = finite(params.D, 0);
  const nSec = Math.max(1, Math.floor(finite(params.nSections, 1)));

  const gi = findMaterial(params.materials, GI_CODE);
  const foam = findMaterial(params.materials, FOAM_CODE);

  const pentapost =
    findProfileByCode(params.profiles, params.profileType) ??
    firstProfileByType(params.profiles, "Pentapost");
  const interpost = firstProfileByType(params.profiles, "Interpost");
  const clip = firstProfileByType(params.profiles, "Clip");
  const corner = firstProfileByType(params.profiles, "Cornerpiece");
  const omega = firstProfileByType(params.profiles, "Omega");
  const gasket = firstProfileByType(params.profiles, "Gasket");
  const rubber = firstProfileByType(params.profiles, "Rubber");

  const items: CalcLineItem[] = [];

  const ppRate = (p: ProfileData) =>
    finite(p.weightPerM, 0) * finite(p.pricePerM, 0);

  if (pentapost) {
    const r = ppRate(pentapost);
    const qh = finite((H / 1000) * 1.05 * 4, 0);
    const qw = finite((W / 1000) * 1.05 * 4, 0);
    const qd = finite((D / 1000) * 1.05 * 4, 0);
    items.push(
      line({
        description: `Pentapost H (${pentapost.code})`,
        uom: "m",
        qty: qh,
        qtyFormula: `(${H}/1000)*1.05*4`,
        unitPrice: r,
        componentRef: pentapost.code,
      }),
      line({
        description: `Pentapost W (${pentapost.code})`,
        uom: "m",
        qty: qw,
        qtyFormula: `(${W}/1000)*1.05*4`,
        unitPrice: r,
        componentRef: pentapost.code,
      }),
      line({
        description: `Pentapost D (${pentapost.code})`,
        uom: "m",
        qty: qd,
        qtyFormula: `(${D}/1000)*1.05*4`,
        unitPrice: r,
        componentRef: pentapost.code,
      })
    );
  }

  if (interpost) {
    const r = ppRate(interpost);
    const mult = nSec;
    const qh = finite((H / 1000) * 1.05 * 2 * mult, 0);
    const qw = finite((W / 1000) * 1.05 * 2 * mult, 0);
    items.push(
      line({
        description: `Interpost H (${interpost.code}) × nSections`,
        uom: "m",
        qty: qh,
        qtyFormula: `(${H}/1000)*1.05*2*${nSec}`,
        unitPrice: r,
        componentRef: interpost.code,
        notes: `nSections=${nSec}`,
      }),
      line({
        description: `Interpost W (${interpost.code}) × nSections`,
        uom: "m",
        qty: qw,
        qtyFormula: `(${W}/1000)*1.05*2*${nSec}`,
        unitPrice: r,
        componentRef: interpost.code,
      })
    );
  }

  if (corner) {
    const up = finite(corner.pricePerM, 0);
    items.push(
      line({
        description: `Corner piece (${corner.code})`,
        uom: "pcs",
        qty: 8,
        qtyFormula: "8",
        unitPrice: up,
        componentRef: corner.code,
        notes: "pricePerM field used as price per piece",
      })
    );
  }

  if (omega) {
    const up = finite(omega.pricePerM, 0);
    items.push(
      line({
        description: `Omega joint (${omega.code})`,
        uom: "pcs",
        qty: 8,
        qtyFormula: "8",
        unitPrice: up,
        componentRef: omega.code,
        notes: "pricePerM field used as price per piece",
      })
    );
  }

  if (clip) {
    const r = ppRate(clip);
    items.push(
      line({
        description: `Panel clip H (${clip.code})`,
        uom: "m",
        qty: finite((H / 1000) * 1.05 * 8, 0),
        qtyFormula: `(${H}/1000)*1.05*8`,
        unitPrice: r,
        componentRef: clip.code,
      }),
      line({
        description: `Panel clip W (${clip.code})`,
        uom: "m",
        qty: finite((W / 1000) * 1.05 * 8, 0),
        qtyFormula: `(${W}/1000)*1.05*8`,
        unitPrice: r,
        componentRef: clip.code,
      }),
      line({
        description: `Panel clip D (${clip.code})`,
        uom: "m",
        qty: finite((D / 1000) * 1.05 * 8, 0),
        qtyFormula: `(${D}/1000)*1.05*8`,
        unitPrice: r,
        componentRef: clip.code,
      })
    );
  }

  if (gasket) {
    const qm = finite((2 * (H + W + H + D)) / 1000, 0) * 1.05;
    const up = finite(gasket.pricePerM, 0);
    items.push(
      line({
        description: `Gasket perimeter (${gasket.code})`,
        uom: "m",
        qty: qm,
        qtyFormula: `2*(${H}+${W}+${H}+${D})/1000*1.05`,
        unitPrice: up,
        componentRef: gasket.code,
      })
    );
  }

  if (rubber) {
    const qm = finite((2 * (H + W + H + D)) / 1000, 0) * 1.05;
    const up = finite(rubber.pricePerM, 0);
    items.push(
      line({
        description: `Rubber insert (${rubber.code})`,
        uom: "m",
        qty: qm,
        qtyFormula: `2*(${H}+${W}+${H}+${D})/1000*1.05`,
        unitPrice: up,
        componentRef: rubber.code,
      })
    );
  }

  if (gi) {
    const dens = finite(gi.density, 0);
    const pk = finite(gi.pricePerKg, 0);
    const wf = LINER_WASTE;

    const frontBackArea = finite((H * W) / 1_000_000, 0);
    const kgFB =
      frontBackArea * 2 * dens * GI_THICKNESS_M * wf;
    items.push(
      line({
        description: "Front/back panel liner (GI 1.0mm)",
        uom: "kg",
        qty: kgFB,
        qtyFormula: `(${H}*${W}/1e6)*2*${dens}*${GI_THICKNESS_M}*${wf}`,
        unitPrice: pk,
        wasteFactor: 1,
        componentRef: GI_CODE,
      })
    );

    const topBotArea = finite((W * D) / 1_000_000, 0);
    const kgTB = topBotArea * 2 * dens * GI_THICKNESS_M * wf;
    items.push(
      line({
        description: "Top/bottom panel liner (GI 1.0mm)",
        uom: "kg",
        qty: kgTB,
        qtyFormula: `(${W}*${D}/1e6)*2*${dens}*${GI_THICKNESS_M}*${wf}`,
        unitPrice: pk,
        wasteFactor: 1,
        componentRef: GI_CODE,
      })
    );

    const sideArea = finite((H * D) / 1_000_000, 0);
    const kgLR = sideArea * 2 * dens * GI_THICKNESS_M * wf;
    items.push(
      line({
        description: "LH/RH panel liner (GI 1.0mm)",
        uom: "kg",
        qty: kgLR,
        qtyFormula: `(${H}*${D}/1e6)*2*${dens}*${GI_THICKNESS_M}*${wf}`,
        unitPrice: pk,
        wasteFactor: 1,
        componentRef: GI_CODE,
      })
    );
  }

  if (foam && pentapost?.panelThick != null) {
    const ptMm = finite(pentapost.panelThick, 0);
    const ptM = ptMm / 1000;
    const foamDens = finite(foam.density, 0);
    const foamPrice = finite(foam.pricePerKg, 0);
    const totalArea = finite(
      (2 * (H * W + W * D + H * D)) / 1_000_000,
      0
    );
    const vol = finite(totalArea * ptM, 0);
    const kgFoam = finite(vol * foamDens, 0);
    items.push(
      line({
        description: `PU foam insulation (${foam.code}, panel ${ptMm}mm)`,
        uom: "kg",
        qty: kgFoam,
        qtyFormula: `2*(${H}*${W}+${W}*${D}+${H}*${D})/1e6*(${ptMm}/1000)*${foamDens}`,
        unitPrice: foamPrice,
        wasteFactor: 1,
        componentRef: FOAM_CODE,
      })
    );
  }

  return items.map((it) => ({
    ...it,
    qty: finite(it.qty, 0),
    unitPrice: finite(it.unitPrice, 0),
    subtotal: finite(it.subtotal, 0),
  }));
}
