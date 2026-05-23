/**
 * Tier-2 oracle parity: runtime calculators vs absolute cells in `excel-formulas-dump.json`.
 * Run in CI: `npm test -- oracle-parity`
 */

import type { ComponentCatalog, MaterialPrice, ProfileData } from "@prisma/client";
import { calculateCoil } from "./coil";
import { calculateDamper } from "./damper";
import { calculateDrainPan } from "./drainPan";
import { calculateFramePanel } from "./framePanel";
import { calculateSkid } from "./skid";
import {
  buildStructureWorkbookLines,
  STRUCTURE_ROWS_MOVED_TO_DRAIN_PAN_MODULE,
} from "./structure-workbook";
import {
  dumpCell,
  EPS_IDR,
  EPS_KG,
  numericFromDump,
  readExcelDump,
} from "./parity-dump-helpers";

const SHEET_SKID = "1. AHU-Skid";
const SHEET_STRUCTURE = "3. AHU-Structure";
const SHEET_FRAME = "2. AHU-Frame & Panel";
const SHEET_COIL = "CoilCost 20251027";
const SHEET_DAMPER_FA = "VolDamperCost2023 FA ";
const SHEET_DAMPER_RA = "VolDamperCost2023 RA ";

function mat(
  code: string,
  name: string,
  pricePerKg: number,
  density = 7860
): MaterialPrice {
  return {
    id: code,
    code,
    name,
    category: "raw",
    density,
    pricePerKg,
    currency: "IDR",
    unit: "kg",
    notes: null,
    updatedAt: new Date(),
    createdAt: new Date(),
  };
}

function prof(code: string, type: string, weightPerM: number, pricePerM: number): ProfileData {
  return {
    id: code,
    code,
    name: code,
    type,
    weightPerM,
    pricePerM,
    panelThick: null,
    notes: null,
    updatedAt: new Date(),
    createdAt: new Date(),
  };
}

function comp(
  code: string,
  name: string,
  category: string,
  unitPrice: number,
  unit = "pcs"
): ComponentCatalog {
  return {
    id: code,
    code,
    name,
    category,
    subcategory: null,
    brand: null,
    model: null,
    spec: null,
    unitPrice,
    currency: "IDR",
    unit,
    moq: null,
    leadTimeDays: null,
    supplier: null,
    notes: null,
    updatedAt: new Date(),
    createdAt: new Date(),
  };
}

describe("oracle-parity (app vs excel-formulas-dump.json)", () => {
  const dump = readExcelDump();

  const H = numericFromDump(dumpCell(dump, SHEET_STRUCTURE, "C2"), "value");
  const W = numericFromDump(dumpCell(dump, SHEET_STRUCTURE, "D2"), "value");
  const D = numericFromDump(dumpCell(dump, SHEET_STRUCTURE, "E2"), "value");

  it("skid line masses J18:J20 and skid subtotal O25", () => {
    const skidMat = mat("UNP100-304", "UNP100", numericFromDump(dumpCell(dump, SHEET_SKID, "M18")));
    const lines = calculateSkid({ W, D, materials: [skidMat] });
    expect(lines).toHaveLength(3);
    for (let i = 0; i < 3; i += 1) {
      const row = 18 + i;
      const oracleJ = numericFromDump(dumpCell(dump, SHEET_SKID, `J${row}`));
      expect(Math.abs(lines[i]!.qty - oracleJ)).toBeLessThan(EPS_KG);
    }
    const sumO = lines.reduce((s, it) => s + it.subtotal, 0);
    const oracleO25 = numericFromDump(dumpCell(dump, SHEET_SKID, "O25"));
    expect(Math.abs(sumO - oracleO25)).toBeLessThan(EPS_IDR);
  });

  it("structure + drain pan kg/cost vs N60/O60 (split between modules)", () => {
    const giPk = numericFromDump(dumpCell(dump, SHEET_STRUCTURE, "M24"));
    const ssPk = numericFromDump(dumpCell(dump, SHEET_STRUCTURE, "M38"));
    const shaftPk = numericFromDump(dumpCell(dump, SHEET_STRUCTURE, "M51"));
    const materials: MaterialPrice[] = [
      mat("SGCC-1.5", "GI", giPk, 7860),
      mat("SUS304-1.5", "SS304", ssPk, 8800),
      mat("UNP125-304", "UNP125", giPk, 7860),
      mat("SS316-SHAFT-M12", "Shaft", shaftPk, 8000),
    ];

    const structLines = buildStructureWorkbookLines({ H, W, D, materials }).filter(
      (it) => !STRUCTURE_ROWS_MOVED_TO_DRAIN_PAN_MODULE.has(it.description)
    );
    const drainLines = calculateDrainPan({ H, W, D, materials });

    const sumKg = [...structLines, ...drainLines].reduce((s, it) => s + it.qty, 0);
    const sumSub = [...structLines, ...drainLines].reduce((s, it) => s + it.subtotal, 0);

    const n60 = numericFromDump(dumpCell(dump, SHEET_STRUCTURE, "N60"));
    const o60 = numericFromDump(dumpCell(dump, SHEET_STRUCTURE, "O60"));
    expect(Math.abs(sumKg - n60)).toBeLessThan(EPS_KG);
    expect(Math.abs(sumSub - o60)).toBeLessThan(EPS_IDR);
  });

  it("drain pan oracle rows N38:N41 / O38:O41", () => {
    const ssPk = numericFromDump(dumpCell(dump, SHEET_STRUCTURE, "M38"));
    const materials = [mat("SUS304-1.5", "SS304", ssPk, 8800)];
    const lines = calculateDrainPan({ H, W, D, materials });
    expect(lines).toHaveLength(4);
    const rows = [38, 39, 40, 41];
    for (let i = 0; i < 4; i += 1) {
      const r = rows[i]!;
      const n = numericFromDump(dumpCell(dump, SHEET_STRUCTURE, `N${r}`));
      const o = numericFromDump(dumpCell(dump, SHEET_STRUCTURE, `O${r}`));
      expect(Math.abs(lines[i]!.qty - n)).toBeLessThan(EPS_KG);
      expect(Math.abs(lines[i]!.subtotal - o)).toBeLessThan(EPS_IDR);
    }
  });

  it("coil material subtotal vs V235 (golden coil row)", () => {
    const q236 = numericFromDump(dumpCell(dump, SHEET_COIL, "Q236"));
    const q237 = numericFromDump(dumpCell(dump, SHEET_COIL, "Q237"));
    const q238 = numericFromDump(dumpCell(dump, SHEET_COIL, "Q238"));
    const materials: MaterialPrice[] = [
      mat("AL-FIN", "Fin", q236, 2700),
      mat("COPPER-TUBE", "Cu", q237, 8900),
      mat("SGCC-1.0", "GI", q238, 8030),
    ];
    const fh = numericFromDump(dumpCell(dump, SHEET_COIL, "F211"));
    const fl = numericFromDump(dumpCell(dump, SHEET_COIL, "H211"));
    const rows = numericFromDump(dumpCell(dump, SHEET_COIL, "H209"));
    const fpi = numericFromDump(dumpCell(dump, SHEET_COIL, "G209"));
    const circuits = 1;
    const face209 = numericFromDump(dumpCell(dump, SHEET_COIL, "I209"));
    const finPack = numericFromDump(dumpCell(dump, SHEET_COIL, "I236"));
    const finPitch = numericFromDump(dumpCell(dump, SHEET_COIL, "G211"));
    const finOd = numericFromDump(dumpCell(dump, SHEET_COIL, "G236"));
    const tubeOd = numericFromDump(dumpCell(dump, SHEET_COIL, "F237"));
    const tubeWall = numericFromDump(dumpCell(dump, SHEET_COIL, "G237"));
    const tubeStretch = numericFromDump(dumpCell(dump, SHEET_COIL, "H237"));
    const tubePrimary = numericFromDump(dumpCell(dump, SHEET_COIL, "F209"));
    const headerKg = numericFromDump(dumpCell(dump, SHEET_COIL, "M238"));

    const coilLines = calculateCoil({
      FH: fh,
      FL: fl,
      rows,
      FPI: fpi,
      circuits,
      materials,
      coilFaceMm: face209,
      finPitchFactorG211: finPitch,
      finTubeOdMm: finOd,
      tubeOdMm: tubeOd,
      tubeWallMm: tubeWall,
      tubeStretchMm: tubeStretch,
      tubePrimaryFactor: tubePrimary,
      headerAssemblyKg: headerKg,
      finPackSpanMm: finPack,
      finLineWaste: numericFromDump(dumpCell(dump, SHEET_COIL, "O236")),
      tubeLineWaste: numericFromDump(dumpCell(dump, SHEET_COIL, "O237")),
    });
    const appTotal = coilLines.reduce((s, it) => s + it.subtotal, 0);
    const v235 = numericFromDump(dumpCell(dump, SHEET_COIL, "V235"));
    expect(Math.abs(appTotal - v235)).toBeLessThan(EPS_IDR);
  });

  it("calculateFramePanel subtotal vs frame oracle O96 (=SUM(O18:O95))", () => {
    const m44 = numericFromDump(dumpCell(dump, SHEET_FRAME, "M44"));
    const m45 = numericFromDump(dumpCell(dump, SHEET_FRAME, "M45"));
    const c44 = numericFromDump(dumpCell(dump, SHEET_FRAME, "C44"), "value");
    const i44 = numericFromDump(dumpCell(dump, SHEET_FRAME, "I44"), "value");
    const i45 = numericFromDump(dumpCell(dump, SHEET_FRAME, "I45"), "value");
    const c45 = numericFromDump(dumpCell(dump, SHEET_FRAME, "C45"), "value");
    const f45 = numericFromDump(dumpCell(dump, SHEET_FRAME, "F45"), "value");
    const materials: MaterialPrice[] = [
      mat("SGCC-1.0", "GI shell", m44, 7860),
      mat("PU-FOAM", "PU", m45, f45),
    ];
    const profiles: ProfileData[] = [
      prof("5060Y-NA06", "Pentapost", 1, 175_000),
      prof("DS5040", "Interpost", 1, 132_000),
      prof("PBP-CL", "Clip", 1, 24357.6219512195),
      prof("COR-01", "Cornerpiece", 0, 90_500),
      prof("OM-01", "Omega", 0, 14_500),
      prof("GAS-01", "Gasket", 0, 24991.46341463415),
      prof("RUB-01", "Rubber", 0, 9000),
    ];
    profiles[0] = {
      ...profiles[0]!,
      panelThick: c45,
    };
    const lines = calculateFramePanel({
      H,
      W,
      D,
      profileType: "5060Y-NA06",
      nSections: 1,
      profiles,
      materials,
      linerThicknessMm: c44,
      linerWasteFactor: i44,
      foamPanelThicknessMm: c45,
      foamWasteFactor: i45,
    });
    const appTotal = lines.reduce((s, it) => s + it.subtotal, 0);
    const o96 = numericFromDump(dumpCell(dump, SHEET_FRAME, "O96"));
    expect(Math.abs(appTotal - o96)).toBeLessThan(EPS_IDR);
  });

  it("VolDamper FA/RA — S59 equals SUM(S50:S58)", () => {
    for (const sheet of [SHEET_DAMPER_FA, SHEET_DAMPER_RA]) {
      let sumS = 0;
      for (let r = 50; r <= 58; r += 1) {
        sumS += numericFromDump(dumpCell(dump, sheet, `S${r}`));
      }
      const s59 = numericFromDump(dumpCell(dump, sheet, "S59"));
      expect(Math.abs(sumS - s59)).toBeLessThan(EPS_IDR);
    }
  });

  it("calculateDamper total vs VolDamper S59 (FA + RA, C43×P43, B44 from dump)", () => {
    const wOp = numericFromDump(dumpCell(dump, SHEET_DAMPER_FA, "C43"));
    const hOp = numericFromDump(dumpCell(dump, SHEET_DAMPER_FA, "P43"));
    const b44 = Math.round(numericFromDump(dumpCell(dump, SHEET_DAMPER_FA, "B44"), "value"));
    const profiles: ProfileData[] = [prof("AL-BASE", "aluminium", 1, 1)];
    const materials: MaterialPrice[] = [mat("AL-FIN", "Fin", 1, 2700)];
    const components: ComponentCatalog[] = [comp("DAMPER-GEAR", "Damper gear", "damper", 0)];

    const fa = calculateDamper({ W: wOp, H: hOp, type: "FA", b44, profiles, materials, components });
    const ra = calculateDamper({ W: wOp, H: hOp, type: "RA", b44, profiles, materials, components });
    const s59Fa = numericFromDump(dumpCell(dump, SHEET_DAMPER_FA, "S59"));
    const s59Ra = numericFromDump(dumpCell(dump, SHEET_DAMPER_RA, "S59"));
    expect(Math.abs(fa.reduce((s, it) => s + it.subtotal, 0) - s59Fa)).toBeLessThan(EPS_IDR);
    expect(Math.abs(ra.reduce((s, it) => s + it.subtotal, 0) - s59Ra)).toBeLessThan(EPS_IDR);
  });
});
