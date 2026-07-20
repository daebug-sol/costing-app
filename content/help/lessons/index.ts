import type { HelpLesson } from "../types";
import { drillDashboard } from "./drill-dashboard";
import { editSelCosting } from "./edit-sel-costing";
import { exportQuotation } from "./export-quotation";
import { folderDanFile } from "./folder-dan-file";
import { orientasiAplikasi } from "./orientasi-aplikasi";
import { proyekDanSegment } from "./proyek-dan-segment";
import { quotationDariProyek } from "./quotation-dari-proyek";
import { setupOrganisasi } from "./setup-organisasi";
import { temaTampilan } from "./tema-tampilan";

/** Ordered MVP curriculum — keep in sync with UX acceptance Scenario 10. */
export const HELP_LESSONS: HelpLesson[] = [
  orientasiAplikasi,
  setupOrganisasi,
  folderDanFile,
  proyekDanSegment,
  editSelCosting,
  quotationDariProyek,
  exportQuotation,
  drillDashboard,
  temaTampilan,
];
