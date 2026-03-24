/** Matches costing workspace margin / selling calculation. */

export function finite(n: number, fallback = 0) {
  return Number.isFinite(n) ? n : fallback;
}

export function computeCostSummary(
  hppIn: number,
  qtyIn: number,
  m: {
    overhead: number;
    contingency: number;
    eskalasi: number;
    asuransi: number;
    mobilisasi: number;
    margin: number;
  },
  t: { esk: boolean; asu: boolean; mob: boolean }
) {
  const hpp = finite(hppIn, 0);
  const oh = hpp * (finite(m.overhead, 0) / 100);
  const cont = hpp * (finite(m.contingency, 0) / 100);
  const esk = t.esk ? hpp * (finite(m.eskalasi, 0) / 100) : 0;
  const asu = t.asu ? hpp * (finite(m.asuransi, 0) / 100) : 0;
  const mob = t.mob ? hpp * (finite(m.mobilisasi, 0) / 100) : 0;
  const totalCost = hpp + oh + cont + esk + asu + mob;
  const marginAmt = totalCost * (finite(m.margin, 0) / 100);
  const selling = totalCost + marginAmt;
  const q = Math.max(1, Math.floor(finite(qtyIn, 1)));
  const perUnit = selling / q;
  return { hpp, oh, cont, esk, asu, mob, totalCost, marginAmt, selling, perUnit };
}

export function marginTogglesFromProject(project: {
  eskalasi: number;
  asuransi: number;
  mobilisasi: number;
}) {
  return {
    esk: finite(project.eskalasi, 0) !== 0,
    asu: finite(project.asuransi, 0) !== 0,
    mob: finite(project.mobilisasi, 0) !== 0,
  };
}
