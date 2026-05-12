import { buildStructureWorkbookLines, STRUCTURE_ROWS_MOVED_TO_DRAIN_PAN_MODULE } from "./structure-workbook";

/**
 * Structure shell + channels (workbook `3. AHU-Structure`) excluding rows 38–41 that are
 * costed under `calculateDrainPan` so segment rollup does not double-count them.
 */
export function calculateStructure(params: {
  H: number;
  W: number;
  D: number;
  materials: import("./types").MaterialPrice[];
}): import("./types").CalcLineItem[] {
  return buildStructureWorkbookLines(params).filter(
    (it) => !STRUCTURE_ROWS_MOVED_TO_DRAIN_PAN_MODULE.has(it.description)
  );
}
