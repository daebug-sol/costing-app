import type { CalcLineItem, MaterialPrice, ProfileData } from "./types";
import {
  finite,
  findMaterial,
  findProfileByCode,
  firstProfileByType,
} from "./types";

const GI_CODE = "SGCC-1.0";
const FOAM_CODE = "PU-FOAM";
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
  /** Inner/outer GI liner thickness (mm). Default 1.0 (legacy app path). */
  linerThicknessMm?: number;
  /** Workbook-style waste on GI liner mass (e.g. 1.15 on `2. AHU-Frame & Panel`). Default 1.05. */
  linerWasteFactor?: number;
  /** PU panel thickness (mm). Defaults to `pentapost.panelThick` when set. */
  foamPanelThicknessMm?: number;
  /** Waste factor on PU kg (e.g. 1.1). Default 1.1. */
  foamWasteFactor?: number;
}): CalcLineItem[] {
  const H = finite(params.H, 0);
  const W = finite(params.W, 0);
  const D = finite(params.D, 0);
  const nSec = Math.max(1, Math.floor(finite(params.nSections, 1)));

  const gi = findMaterial(params.materials, GI_CODE);
  const foam = findMaterial(params.materials, FOAM_CODE);

  const linerThicknessM = finite((params.linerThicknessMm ?? 1) / 1000, 0);
  const linerWaste = finite(params.linerWasteFactor ?? LINER_WASTE, 0);
  const foamWaste = finite(params.foamWasteFactor ?? 1.1, 0);

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
    if (r > 0) {
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
  }

  if (interpost) {
    const r = ppRate(interpost);
    if (r > 0) {
      const mult = nSec;
      const qh = finite((H / 1000) * 1.05 * 2 * mult, 0);
      const qw = finite((W / 1000) * 1.05 * 2 * mult, 0);
      const qd = finite((D / 1000) * 1.05 * 2 * mult, 0);
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
          notes: `nSections=${nSec}`,
        }),
        line({
          description: `Interpost D (${interpost.code}) × nSections`,
          uom: "m",
          qty: qd,
          qtyFormula: `(${D}/1000)*1.05*2*${nSec}`,
          unitPrice: r,
          componentRef: interpost.code,
          notes: `nSections=${nSec}`,
        })
      );
    }
  }

  if (corner) {
    const up = finite(corner.pricePerM, 0);
    if (up > 0) {
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
  }

  if (omega) {
    const up = finite(omega.pricePerM, 0);
    if (up > 0) {
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
  }

  if (clip) {
    const r = ppRate(clip);
    if (r > 0) {
      const jH = finite((H / 1000) * 1.05, 0);
      const jW = finite((W / 1000) * 1.05, 0);
      const jD = finite((D / 1000) * 1.05, 0);
      /** Workbook `K20*2` style multiplier for pentapost clip rows. */
      const kClipPent = 8;
      /** Interpost clip rows use `K23*2` per template → scale with `nSections`. */
      const kClipInter = 4 * nSec;

      if (pentapost) {
        items.push(
          line({
            description: `Panel clip H — pentapost (${clip.code})`,
            uom: "m",
            qty: finite(jH * kClipPent, 0),
            qtyFormula: `(${H}/1000)*1.05*${kClipPent}`,
            unitPrice: r,
            componentRef: clip.code,
          }),
          line({
            description: `Panel clip W — pentapost (${clip.code})`,
            uom: "m",
            qty: finite(jW * kClipPent, 0),
            qtyFormula: `(${W}/1000)*1.05*${kClipPent}`,
            unitPrice: r,
            componentRef: clip.code,
          }),
          line({
            description: `Panel clip D — pentapost (${clip.code})`,
            uom: "m",
            qty: finite(jD * kClipPent, 0),
            qtyFormula: `(${D}/1000)*1.05*${kClipPent}`,
            unitPrice: r,
            componentRef: clip.code,
          })
        );
      }
      if (interpost) {
        items.push(
          line({
            description: `Panel clip H — interpost (${clip.code})`,
            uom: "m",
            qty: finite(jH * kClipInter, 0),
            qtyFormula: `(${H}/1000)*1.05*${kClipInter}`,
            unitPrice: r,
            componentRef: clip.code,
            notes: `nSections=${nSec}`,
          }),
          line({
            description: `Panel clip W — interpost (${clip.code})`,
            uom: "m",
            qty: finite(jW * kClipInter, 0),
            qtyFormula: `(${W}/1000)*1.05*${kClipInter}`,
            unitPrice: r,
            componentRef: clip.code,
            notes: `nSections=${nSec}`,
          }),
          line({
            description: `Panel clip D — interpost (${clip.code})`,
            uom: "m",
            qty: finite(jD * kClipInter, 0),
            qtyFormula: `(${D}/1000)*1.05*${kClipInter}`,
            unitPrice: r,
            componentRef: clip.code,
            notes: `nSections=${nSec}`,
          })
        );
      }
    }
  }

  if (gasket) {
    const up = finite(gasket.pricePerM, 0);
    if (up > 0) {
      const jH = finite((H / 1000) * 1.05, 0);
      const jW = finite((W / 1000) * 1.05, 0);
      const jD = finite((D / 1000) * 1.05, 0);
      const kGasketPent = 8;
      const kGasketInter = 4 * nSec;

      if (pentapost) {
        items.push(
          line({
            description: `Gasket — pentapost H (${gasket.code})`,
            uom: "m",
            qty: finite(jH * kGasketPent, 0),
            qtyFormula: `(${H}/1000)*1.05*${kGasketPent}`,
            unitPrice: up,
            componentRef: gasket.code,
          }),
          line({
            description: `Gasket — pentapost W (${gasket.code})`,
            uom: "m",
            qty: finite(jW * kGasketPent, 0),
            qtyFormula: `(${W}/1000)*1.05*${kGasketPent}`,
            unitPrice: up,
            componentRef: gasket.code,
          }),
          line({
            description: `Gasket — pentapost D (${gasket.code})`,
            uom: "m",
            qty: finite(jD * kGasketPent, 0),
            qtyFormula: `(${D}/1000)*1.05*${kGasketPent}`,
            unitPrice: up,
            componentRef: gasket.code,
          })
        );
      }
      if (interpost) {
        items.push(
          line({
            description: `Gasket — interpost H (${gasket.code})`,
            uom: "m",
            qty: finite(jH * kGasketInter, 0),
            qtyFormula: `(${H}/1000)*1.05*${kGasketInter}`,
            unitPrice: up,
            componentRef: gasket.code,
            notes: `nSections=${nSec}`,
          }),
          line({
            description: `Gasket — interpost W (${gasket.code})`,
            uom: "m",
            qty: finite(jW * kGasketInter, 0),
            qtyFormula: `(${W}/1000)*1.05*${kGasketInter}`,
            unitPrice: up,
            componentRef: gasket.code,
            notes: `nSections=${nSec}`,
          }),
          line({
            description: `Gasket — interpost D (${gasket.code})`,
            uom: "m",
            qty: finite(jD * kGasketInter, 0),
            qtyFormula: `(${D}/1000)*1.05*${kGasketInter}`,
            unitPrice: up,
            componentRef: gasket.code,
            notes: `nSections=${nSec}`,
          })
        );
      }

      if (!pentapost && !interpost) {
        const qm = finite((2 * (H + W + H + D)) / 1000, 0) * 1.05;
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
    }
  }

  if (rubber) {
    const up = finite(rubber.pricePerM, 0);
    if (up > 0) {
      const jH = finite((H / 1000) * 1.05, 0);
      const jW = finite((W / 1000) * 1.05, 0);
      const jD = finite((D / 1000) * 1.05, 0);
      const kRubberPent = 8;
      const kRubberInter = 4 * nSec;

      if (pentapost) {
        items.push(
          line({
            description: `Rubber insert — pentapost H (${rubber.code})`,
            uom: "m",
            qty: finite(jH * kRubberPent, 0),
            qtyFormula: `(${H}/1000)*1.05*${kRubberPent}`,
            unitPrice: up,
            componentRef: rubber.code,
          }),
          line({
            description: `Rubber insert — pentapost W (${rubber.code})`,
            uom: "m",
            qty: finite(jW * kRubberPent, 0),
            qtyFormula: `(${W}/1000)*1.05*${kRubberPent}`,
            unitPrice: up,
            componentRef: rubber.code,
          }),
          line({
            description: `Rubber insert — pentapost D (${rubber.code})`,
            uom: "m",
            qty: finite(jD * kRubberPent, 0),
            qtyFormula: `(${D}/1000)*1.05*${kRubberPent}`,
            unitPrice: up,
            componentRef: rubber.code,
          })
        );
      }
      if (interpost) {
        items.push(
          line({
            description: `Rubber insert — interpost H (${rubber.code})`,
            uom: "m",
            qty: finite(jH * kRubberInter, 0),
            qtyFormula: `(${H}/1000)*1.05*${kRubberInter}`,
            unitPrice: up,
            componentRef: rubber.code,
            notes: `nSections=${nSec}`,
          }),
          line({
            description: `Rubber insert — interpost W (${rubber.code})`,
            uom: "m",
            qty: finite(jW * kRubberInter, 0),
            qtyFormula: `(${W}/1000)*1.05*${kRubberInter}`,
            unitPrice: up,
            componentRef: rubber.code,
            notes: `nSections=${nSec}`,
          }),
          line({
            description: `Rubber insert — interpost D (${rubber.code})`,
            uom: "m",
            qty: finite(jD * kRubberInter, 0),
            qtyFormula: `(${D}/1000)*1.05*${kRubberInter}`,
            unitPrice: up,
            componentRef: rubber.code,
            notes: `nSections=${nSec}`,
          })
        );
      }

      if (!pentapost && !interpost) {
        const qm = finite((2 * (H + W + H + D)) / 1000, 0) * 1.05;
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
    }
  }

  if (gi) {
    const dens = finite(gi.density, 0);
    const pk = finite(gi.pricePerKg, 0);
    const wf = linerWaste;

    /** One enclosure face (m²): inner + outer GI → kg (matches one `O*` liner row on `2. AHU-Frame & Panel`). */
    const kgOneFace = (faceAreaM2: number) =>
      finite(faceAreaM2 * 2 * dens * linerThicknessM * wf, 0);

    const faceHW = finite((H * W) / 1_000_000, 0);
    const faceWD = finite((W * D) / 1_000_000, 0);
    const faceHD = finite((H * D) / 1_000_000, 0);

    const giFace = (
      description: string,
      faceAreaM2: number,
      areaFormula: string
    ) => {
      const kg = kgOneFace(faceAreaM2);
      items.push(
        line({
          description,
          uom: "kg",
          qty: kg,
          qtyFormula: `${areaFormula}*2*${dens}*${linerThicknessM}*${wf}`,
          unitPrice: pk,
          wasteFactor: 1,
          componentRef: GI_CODE,
        })
      );
    };

    giFace("Front panel liner (GI 1.0mm)", faceHW, `(${H}*${W}/1e6)`);
    giFace("Back panel liner (GI 1.0mm)", faceHW, `(${H}*${W}/1e6)`);
    giFace("Top panel liner (GI 1.0mm)", faceWD, `(${W}*${D}/1e6)`);
    giFace("Bottom panel liner (GI 1.0mm)", faceWD, `(${W}*${D}/1e6)`);
    giFace("LH panel liner (GI 1.0mm)", faceHD, `(${H}*${D}/1e6)`);
    giFace("RH panel liner (GI 1.0mm)", faceHD, `(${H}*${D}/1e6)`);
  }

  if (foam && pentapost?.panelThick != null) {
    const ptMm = finite(params.foamPanelThicknessMm ?? pentapost.panelThick, 0);
    const ptM = ptMm / 1000;
    const foamDens = finite(foam.density, 0);
    const foamPrice = finite(foam.pricePerKg, 0);
    const totalArea = finite(
      (2 * (H * W + W * D + H * D)) / 1_000_000,
      0
    );
    const vol = finite(totalArea * ptM, 0);
    const kgFoam = finite(vol * foamDens * foamWaste, 0);
    items.push(
      line({
        description: `PU foam insulation (${foam.code}, panel ${ptMm}mm)`,
        uom: "kg",
        qty: kgFoam,
        qtyFormula: `2*(${H}*${W}+${W}*${D}+${H}*${D})/1e6*(${ptMm}/1000)*${foamDens}*${foamWaste}`,
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
