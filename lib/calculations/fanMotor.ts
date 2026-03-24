import type { CalcLineItem, ComponentCatalog } from "./types";
import { finite } from "./types";

const SPRING_CODE = "SPRING-ISOLATOR";

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

export function calculateFanMotor(params: {
  fanModel: string;
  motorKW: number;
  motorPoles: number;
  qty: number;
  components: ComponentCatalog[];
}): CalcLineItem[] {
  const fanModel = norm(params.fanModel);
  const motorKW = finite(params.motorKW, 0);
  const motorPoles = Math.max(0, Math.floor(finite(params.motorPoles, 0)));
  const qty = Math.max(0, Math.floor(finite(params.qty, 1)));

  const comps = params.components;

  const fan =
    comps.find(
      (c) =>
        norm(c.model ?? "") === fanModel ||
        norm(c.code) === fanModel ||
        (fanModel.length > 0 &&
          (norm(c.name).includes(fanModel) ||
            norm(c.model ?? "").includes(fanModel)))
    ) ??
    comps.find(
      (c) =>
        c.category.toLowerCase().includes("fan") &&
        fanModel.length > 0 &&
        norm(c.name).includes(fanModel)
    );

  const kwStr = String(motorKW);
  const poleStr = String(motorPoles);
  const motor =
    comps.find((c) => {
      const n = norm(c.name);
      const spec = norm(c.spec ?? "");
      const mdl = norm(c.model ?? "");
      const hay = `${n} ${spec} ${mdl}`;
      return (
        hay.includes(kwStr) &&
        (hay.includes(`${poleStr}p`) ||
          hay.includes(`${poleStr} pole`) ||
          hay.includes(` ${poleStr} `))
      );
    }) ??
    comps.find(
      (c) =>
        c.category.toLowerCase().includes("motor") &&
        kwStr.length &&
        norm(c.name).includes(kwStr)
    );

  const spring = comps.find((c) => c.code === SPRING_CODE);

  const items: CalcLineItem[] = [];

  if (fan) {
    const up = finite(fan.unitPrice, 0);
    items.push(
      line({
        description: `Fan (${fan.name})`,
        uom: fan.unit || "pcs",
        qty,
        qtyFormula: String(qty),
        unitPrice: up,
        componentRef: fan.code,
      })
    );
  } else {
    items.push(
      line({
        description: `Fan (model: ${params.fanModel || "—"})`,
        uom: "pcs",
        qty,
        qtyFormula: String(qty),
        unitPrice: 0,
        notes: "No matching component; add catalog row with model/code",
      })
    );
  }

  if (motor) {
    const up = finite(motor.unitPrice, 0);
    items.push(
      line({
        description: `Motor (${motor.name})`,
        uom: motor.unit || "pcs",
        qty,
        qtyFormula: String(qty),
        unitPrice: up,
        componentRef: motor.code,
      })
    );
  } else {
    items.push(
      line({
        description: `Motor (${motorKW} kW, ${motorPoles} poles)`,
        uom: "pcs",
        qty,
        qtyFormula: String(qty),
        unitPrice: 0,
        notes: "No matching component in catalog",
      })
    );
  }

  if (spring) {
    const up = finite(spring.unitPrice, 0);
    items.push(
      line({
        description: `Spring isolator (${spring.code})`,
        uom: "pcs",
        qty: 4 * qty,
        qtyFormula: `4*${qty}`,
        unitPrice: up,
        componentRef: spring.code,
      })
    );
  } else {
    items.push(
      line({
        description: "Spring isolator",
        uom: "pcs",
        qty: 4 * qty,
        qtyFormula: `4*${qty}`,
        unitPrice: 0,
        notes: `Add component code ${SPRING_CODE}`,
      })
    );
  }

  return items;
}
