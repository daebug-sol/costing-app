import type { TourDefinition } from "@/lib/tour/types";

export const costingTour: TourDefinition = {
  key: "costing",
  route: "/costing",
  permission: "costing:write",
  invite: {
    title: {
      id: "Coba buat costing pertama",
      en: "Try your first costing",
    },
    minutes: 3,
  },
  steps: [],
};
