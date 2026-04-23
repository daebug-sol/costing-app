import type { CalcLineItem, ComponentCatalog } from "./types";
import { finite } from "./types";

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

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function findComponentByKeywords(
  components: ComponentCatalog[],
  keywords: string[]
): ComponentCatalog | undefined {
  const keys = keywords.map((k) => norm(k));
  return components.find((c) => {
    const hay = norm(
      `${c.code} ${c.name} ${c.category} ${c.subcategory ?? ""} ${c.model ?? ""} ${c.spec ?? ""}`
    );
    return keys.every((k) => hay.includes(k));
  });
}

function componentPrice(c: ComponentCatalog | undefined): number {
  return c ? finite(c.unitPrice, 0) : 0;
}

export function calculateAccessDoor(params: {
  qty: number;
  height: number;
  width: number;
  withWindow: boolean;
  components: ComponentCatalog[];
}): CalcLineItem[] {
  const qty = Math.max(1, Math.floor(finite(params.qty, 1)));
  const h = finite(params.height, 0);
  const w = finite(params.width, 0);
  const perimeterM = (2 * (h + w)) / 1000;
  const panelM2 = (h * w) / 1_000_000;

  const doorSet = findComponentByKeywords(params.components, ["access", "door"]);
  const gasket = findComponentByKeywords(params.components, ["gasket"]);
  const windowKit = findComponentByKeywords(params.components, ["window"]);

  const rows: CalcLineItem[] = [
    line({
      description: "Access door set",
      uom: doorSet?.unit || "set",
      qty,
      qtyFormula: String(qty),
      unitPrice: componentPrice(doorSet),
      componentRef: doorSet?.code ?? null,
      notes: doorSet ? null : "Tambahkan komponen access door di catalog",
    }),
    line({
      description: "Door gasket perimeter",
      uom: gasket?.unit || "m",
      qty: finite(qty * perimeterM, 0),
      qtyFormula: `${qty}*2*(${h}+${w})/1000`,
      unitPrice: componentPrice(gasket),
      componentRef: gasket?.code ?? null,
      notes: gasket ? null : "Tambahkan komponen gasket di catalog",
    }),
    line({
      description: "Door panel area allowance",
      uom: "m2",
      qty: finite(qty * panelM2, 0),
      qtyFormula: `${qty}*(${h}*${w})/1000000`,
      unitPrice: 0,
      notes: "Allowance area only (harga dari material utama di modul panel/frame)",
    }),
  ];

  if (params.withWindow) {
    rows.push(
      line({
        description: "Door viewing window kit",
        uom: windowKit?.unit || "pcs",
        qty,
        qtyFormula: String(qty),
        unitPrice: componentPrice(windowKit),
        componentRef: windowKit?.code ?? null,
        notes: windowKit ? null : "Tambahkan komponen window kit di catalog",
      })
    );
  }

  return rows;
}

export function calculateMixingBox(params: {
  faFlowCMH: number;
  raFlowCMH: number;
  faDamperW: number;
  faDamperH: number;
  raDamperW: number;
  raDamperH: number;
  components: ComponentCatalog[];
}): CalcLineItem[] {
  const faW = finite(params.faDamperW, 0);
  const faH = finite(params.faDamperH, 0);
  const raW = finite(params.raDamperW, 0);
  const raH = finite(params.raDamperH, 0);
  const faFlow = finite(params.faFlowCMH, 0);
  const raFlow = finite(params.raFlowCMH, 0);

  const damperSet = findComponentByKeywords(params.components, ["damper"]);
  const linkage = findComponentByKeywords(params.components, ["linkage"]);
  const boxCasing = findComponentByKeywords(params.components, ["mixing", "box"]);

  const items: CalcLineItem[] = [];

  const maybePushDamper = (
    label: "FA" | "RA",
    w: number,
    h: number,
    flowCMH: number
  ) => {
    if (w <= 0 || h <= 0) return;
    items.push(
      line({
        description: `Mixing box damper ${label}`,
        uom: damperSet?.unit || "set",
        qty: 1,
        qtyFormula: "1",
        unitPrice: componentPrice(damperSet),
        componentRef: damperSet?.code ?? null,
        notes: `W×H=${w}×${h} mm; flow=${flowCMH} CMH`,
      })
    );
  };

  maybePushDamper("FA", faW, faH, faFlow);
  maybePushDamper("RA", raW, raH, raFlow);

  const activeDampers =
    (faW > 0 && faH > 0 ? 1 : 0) + (raW > 0 && raH > 0 ? 1 : 0);
  if (activeDampers > 0) {
    items.push(
      line({
        description: "Mixing box linkage kit",
        uom: linkage?.unit || "set",
        qty: activeDampers,
        qtyFormula: String(activeDampers),
        unitPrice: componentPrice(linkage),
        componentRef: linkage?.code ?? null,
        notes: linkage ? null : "Tambahkan komponen linkage kit di catalog",
      })
    );
  }

  items.push(
    line({
      description: "Mixing box casing set",
      uom: boxCasing?.unit || "set",
      qty: 1,
      qtyFormula: "1",
      unitPrice: componentPrice(boxCasing),
      componentRef: boxCasing?.code ?? null,
      notes: boxCasing ? null : "Tambahkan komponen mixing box set di catalog",
    })
  );

  return items;
}

export function calculateFilters(params: {
  panelQty: number;
  bagQty: number;
  panelClass: string;
  bagClass: string;
  components: ComponentCatalog[];
}): CalcLineItem[] {
  const panelQty = Math.max(0, Math.floor(finite(params.panelQty, 0)));
  const bagQty = Math.max(0, Math.floor(finite(params.bagQty, 0)));
  const pClass = params.panelClass.trim();
  const bClass = params.bagClass.trim();

  const panel = findComponentByKeywords(params.components, [
    "panel",
    "filter",
    pClass || "filter",
  ]);
  const bag = findComponentByKeywords(params.components, [
    "bag",
    "filter",
    bClass || "filter",
  ]);

  return [
    line({
      description: `Panel filter${pClass ? ` (${pClass})` : ""}`,
      uom: panel?.unit || "pcs",
      qty: panelQty,
      qtyFormula: String(panelQty),
      unitPrice: componentPrice(panel),
      componentRef: panel?.code ?? null,
      notes: panel ? null : "Tambahkan komponen panel filter di catalog",
    }),
    line({
      description: `Bag filter${bClass ? ` (${bClass})` : ""}`,
      uom: bag?.unit || "pcs",
      qty: bagQty,
      qtyFormula: String(bagQty),
      unitPrice: componentPrice(bag),
      componentRef: bag?.code ?? null,
      notes: bag ? null : "Tambahkan komponen bag filter di catalog",
    }),
  ];
}

export function calculateElectricHeater(params: {
  width: number;
  height: number;
  depth: number;
  steps: number;
  totalLoadKW: number;
  components: ComponentCatalog[];
}): CalcLineItem[] {
  const width = finite(params.width, 0);
  const height = finite(params.height, 0);
  const depth = finite(params.depth, 0);
  const steps = Math.max(1, Math.floor(finite(params.steps, 1)));
  const loadKW = finite(params.totalLoadKW, 0);

  const heater = findComponentByKeywords(params.components, ["heater"]);
  const control = findComponentByKeywords(params.components, ["heater", "control"]);
  const fallbackUnitPrice = finite(loadKW * 250_000, 0);

  return [
    line({
      description: "Electric heater bank",
      uom: heater?.unit || "set",
      qty: 1,
      qtyFormula: "1",
      unitPrice: heater ? componentPrice(heater) : fallbackUnitPrice,
      componentRef: heater?.code ?? null,
      notes: `Dim ${height}×${width}×${depth} mm; load ${loadKW} kW`,
    }),
    line({
      description: "Heater control steps",
      uom: control?.unit || "set",
      qty: steps,
      qtyFormula: String(steps),
      unitPrice: componentPrice(control),
      componentRef: control?.code ?? null,
      notes: control ? null : "Tambahkan komponen heater control di catalog",
    }),
  ];
}

export function calculateOpenings(params: {
  qty: number;
  width: number;
  height: number;
  includeFlex: boolean;
  includeLouvre: boolean;
  includeWireGauze: boolean;
  includeActuator: boolean;
  components: ComponentCatalog[];
}): CalcLineItem[] {
  const qty = Math.max(1, Math.floor(finite(params.qty, 1)));
  const width = finite(params.width, 0);
  const height = finite(params.height, 0);
  const openingSet = findComponentByKeywords(params.components, ["opening"]);
  const flex = findComponentByKeywords(params.components, ["flex"]);
  const louvre = findComponentByKeywords(params.components, ["louvre"]);
  const gauze = findComponentByKeywords(params.components, ["gauze"]);
  const actuator = findComponentByKeywords(params.components, ["actuator"]);

  const rows: CalcLineItem[] = [
    line({
      description: "Inlet/Outlet opening set",
      uom: openingSet?.unit || "set",
      qty,
      qtyFormula: String(qty),
      unitPrice: componentPrice(openingSet),
      componentRef: openingSet?.code ?? null,
      notes: `W×H=${width}×${height} mm`,
    }),
  ];

  const addOptional = (
    enabled: boolean,
    c: ComponentCatalog | undefined,
    desc: string
  ) => {
    if (!enabled) return;
    rows.push(
      line({
        description: desc,
        uom: c?.unit || "pcs",
        qty,
        qtyFormula: String(qty),
        unitPrice: componentPrice(c),
        componentRef: c?.code ?? null,
        notes: c ? null : `Tambahkan komponen ${desc} di catalog`,
      })
    );
  };

  addOptional(params.includeFlex, flex, "Flexible connector");
  addOptional(params.includeLouvre, louvre, "Inlet louvre");
  addOptional(params.includeWireGauze, gauze, "Wire gauze");
  addOptional(params.includeActuator, actuator, "Opening actuator");

  return rows;
}
