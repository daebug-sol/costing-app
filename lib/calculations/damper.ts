import type { CalcLineItem, ComponentCatalog, MaterialPrice, ProfileData } from "./types";
import { finite, findMaterial } from "./types";

const AL_MATERIAL_CODE = "AL6063";
const AL_FIN_CODE = "AL-FIN";
/** Default kg/m when no aluminium profile row exists */
const DEFAULT_AL_KG_PER_M = 0.35;

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

function alUnitRate(
  profiles: ProfileData[],
  materials: MaterialPrice[]
): number {
  const alProf =
    profiles.find((p) => /al/i.test(p.code) || /alumin/i.test(p.name)) ??
    profiles.find((p) => p.type.toLowerCase() === "aluminium");
  if (alProf) {
    return finite(alProf.weightPerM, 0) * finite(alProf.pricePerM, 0);
  }
  const alMat = findMaterial(materials, AL_MATERIAL_CODE);
  const pk = alMat ? finite(alMat.pricePerKg, 0) : 0;
  return finite(DEFAULT_AL_KG_PER_M * pk, 0);
}

function bladeCount(Hmm: number): number {
  return Math.max(1, Math.ceil(finite(Hmm, 0) / 120));
}

function findGear(components: ComponentCatalog[]): ComponentCatalog | undefined {
  return components.find(
    (c) =>
      /gear/i.test(c.name) ||
      /gear/i.test(c.code) ||
      /damper.*gear/i.test(c.name)
  );
}

export function calculateDamper(params: {
  W: number;
  H: number;
  type: "RA" | "FA";
  profiles: ProfileData[];
  materials: MaterialPrice[];
  components: ComponentCatalog[];
}): CalcLineItem[] {
  const W = finite(params.W, 0);
  const H = finite(params.H, 0);
  const rate = alUnitRate(params.profiles, params.materials);
  const fin = findMaterial(params.materials, AL_FIN_CODE);
  const finPk = fin ? finite(fin.pricePerKg, 0) : 0;
  const blades = bladeCount(H);

  const qLR = finite((H / 1000) * 1.1 * 2, 0);
  const qTB = finite((W / 1000) * 1.1 * 2, 0);

  const kgPerBlade = finite(
    (W / 1000) * 0.1232 * 2700 * 0.00011 * 1.1,
    0
  );
  const bladeKg = finite(blades * kgPerBlade, 0);

  const gear = findGear(params.components);

  const items: CalcLineItem[] = [
    line({
      description: `Damper frame L/R (${params.type})`,
      uom: "m",
      qty: qLR,
      qtyFormula: `(${H}/1000)*1.1*2`,
      unitPrice: rate,
      notes: "Al rate = weightPerM×pricePerM or default kg/m × AL6063 price/kg",
    }),
    line({
      description: `Damper frame T/B (${params.type})`,
      uom: "m",
      qty: qTB,
      qtyFormula: `(${W}/1000)*1.1*2`,
      unitPrice: rate,
    }),
    line({
      description: `Damper blades (${params.type}, ${blades} pcs)`,
      uom: "kg",
      qty: bladeKg,
      qtyFormula: `${blades}*(${W}/1000)*0.1232*2700*0.00011*1.1`,
      unitPrice: finPk,
      componentRef: AL_FIN_CODE,
    }),
  ];

  if (gear) {
    const up = finite(gear.unitPrice, 0);
    items.push(
      line({
        description: `Damper gear set (${gear.code})`,
        uom: gear.unit || "pcs",
        qty: 1,
        qtyFormula: "1",
        unitPrice: up,
        componentRef: gear.code,
      })
    );
  } else {
    items.push(
      line({
        description: "Damper gear set (catalog)",
        uom: "pcs",
        qty: 1,
        qtyFormula: "1",
        unitPrice: 0,
        notes: "Add a component with ‘gear’ in name/code",
      })
    );
  }

  return items;
}
