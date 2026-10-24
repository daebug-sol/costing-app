import type { TourDefinition } from "@/lib/tour/types";

export const helpTour: TourDefinition = {
  key: "help",
  route: "/help",
  permission: "dashboard:read",
  invite: {
    title: {
      id: "Lihat cara mengulang tutorial",
      en: "See how to replay tutorials",
    },
    minutes: 1,
  },
  steps: [],
};
