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

  return { ok: true };
}
