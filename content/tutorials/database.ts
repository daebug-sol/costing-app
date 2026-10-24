import type { TourDefinition } from "@/lib/tour/types";

export const databaseTour: TourDefinition = {
  key: "database",
  route: "/database",
  permission: "db:read",
  invite: {
    title: {
      id: "Coba cari dan edit harga",
      en: "Try finding and editing a price",
    },
    minutes: 2,
  },
  steps: [],
};
