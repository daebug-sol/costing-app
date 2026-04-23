import { z } from "zod";
import type { AhuRecalcParams } from "@/lib/ahu-recalc-params";
import {
  hasAnyPartialModule,
  normalizeCostingScope,
  requiresCasingDimensions,
  resolveActiveModules,
  type CostingScope,
} from "@/lib/costing-scope";
import { finite } from "@/lib/calculations";

const nullableNumber = z.union([z.number(), z.null()]);

function segmentDimsBaseSchema() {
  return z.object({
    dimH: nullableNumber,
    dimW: nullableNumber,
    dimD: nullableNumber,
  });
}

/** Validasi dinamis dimensi segmen berdasarkan `CostingScope`. */
export function buildSegmentDimensionsSchema(scope: CostingScope) {
  return segmentDimsBaseSchema().superRefine((val, ctx) => {
    if (!requiresCasingDimensions(scope)) return;
    const ok = (n: number | null) => n != null && Number.isFinite(n) && n > 0;
    if (!ok(val.dimH) || !ok(val.dimW) || !ok(val.dimD)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Dimensi casing H×W×D (mm) wajib diisi untuk modul Frame/Panel, Skid, Structure, atau Drain Pan.",
      });
    }
  });
}

/**
 * Validasi konteks recalculate: scope, dimensi casing, coil-only punya FH×FL.
 * Dipanggil setelah `mergeRecalcParams`.
 */
export function validateAhuRecalculateContext(input: {
  dimH: number | null;
  dimW: number | null;
  dimD: number | null;
  merged: AhuRecalcParams;
}): { ok: true } | { ok: false; message: string } {
  const scope = normalizeCostingScope(input.merged.costingScope);

  if (!scope.isFullAhu && !hasAnyPartialModule(scope)) {
    return {
      ok: false,
      message:
        "Pilih minimal satu modul sub-assembly, atau aktifkan Full AHU.",
    };
  }

  const dimParsed = buildSegmentDimensionsSchema(scope).safeParse({
    dimH: input.dimH,
    dimW: input.dimW,
    dimD: input.dimD,
  });
  if (!dimParsed.success) {
    const first = dimParsed.error.issues[0];
    return {
      ok: false,
      message: first?.message ?? "Validasi dimensi gagal.",
    };
  }

  const modules = resolveActiveModules(scope);
  if (
    modules.coil &&
    !requiresCasingDimensions(scope)
  ) {
    const c = input.merged.coil ?? {};
    const fh = finite(c.FH, 0);
    const fl = finite(c.FL, 0);
    if (fh <= 0 || fl <= 0) {
      return {
        ok: false,
        message:
          "Untuk costing coil tanpa casing: isi FH dan FL coil (mm) di parameter coil.",
      };
    }
  }

  if (modules.damper && !requiresCasingDimensions(scope)) {
    const d = input.merged.damper ?? {};
    const w = finite(d.W, 0);
    const h = finite(d.H, 0);
    if (w <= 0 || h <= 0) {
      return {
        ok: false,
        message:
          "Untuk costing damper tanpa casing: isi lebar (W) dan tinggi (H) damper (mm).",
      };
    }
  }

  if (modules.accessDoor) {
    const d = input.merged.accessDoor ?? {};
    const qty = Math.max(0, Math.floor(finite(d.qty, 1)));
    const h = finite(d.height, input.dimH ?? 0);
    const w = finite(d.width, input.dimW ?? 0);
    if (qty <= 0 || h <= 0 || w <= 0) {
      return {
        ok: false,
        message:
          "Untuk modul Access Door: isi qty dan dimensi door (height × width) > 0.",
      };
    }
  }

  if (modules.mixingBox) {
    const m = input.merged.mixingBox ?? {};
    const faW = finite(m.faDamperW, 0);
    const faH = finite(m.faDamperH, 0);
    const raW = finite(m.raDamperW, 0);
    const raH = finite(m.raDamperH, 0);
    const hasFa = faW > 0 && faH > 0;
    const hasRa = raW > 0 && raH > 0;
    if (!hasFa && !hasRa) {
      return {
        ok: false,
        message:
          "Untuk modul Mixing Box: isi minimal satu dimensi damper FA atau RA (W × H).",
      };
    }
  }

  if (modules.electricHeater) {
    const e = input.merged.electricHeater ?? {};
    const load = finite(e.totalLoadKW, 0);
    const h = finite(e.height, input.dimH ?? 0);
    const w = finite(e.width, input.dimW ?? 0);
    if (load <= 0 || h <= 0 || w <= 0) {
      return {
        ok: false,
        message:
          "Untuk modul Electric Heater: isi total load (kW) dan dimensi heater (H × W) > 0.",
      };
    }
  }

  if (modules.opening) {
    const o = input.merged.opening ?? {};
    const qty = Math.max(0, Math.floor(finite(o.qty, 1)));
    const h = finite(o.height, input.dimH ?? 0);
    const w = finite(o.width, input.dimW ?? 0);
    if (qty <= 0 || h <= 0 || w <= 0) {
      return {
        ok: false,
        message:
          "Untuk modul Inlet/Outlet Opening: isi qty dan dimensi opening (height × width) > 0.",
      };
    }
  }

  return { ok: true };
}
