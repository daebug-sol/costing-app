import type { TourDefinition } from "@/lib/tour/types";

export const dashboardTour: TourDefinition = {
  key: "dashboard",
  route: "/",
  permission: "dashboard:read",
  invite: {
    title: {
      id: "Kenali dashboard Anda",
      en: "Get to know your dashboard",
    },
    minutes: 2,
  },
  steps: [],
};
