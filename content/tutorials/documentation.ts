import type { TourDefinition } from "@/lib/tour/types";

export const documentationTour: TourDefinition = {
  key: "documentation",
  route: "/documentation",
  permission: "o2c:quote",
  invite: {
    title: {
      id: "Coba buka penawaran dan unduh PDF",
      en: "Try opening a quotation and downloading the PDF",
    },
    minutes: 2,
  },
  steps: [],
};
