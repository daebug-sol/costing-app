import type { TourDefinition } from "@/lib/tour/types";

export const settingsTour: TourDefinition = {
  key: "settings",
  route: "/settings",
  permission: "settings:write",
  invite: {
    title: {
      id: "Lengkapi data perusahaan",
      en: "Complete your company details",
    },
    minutes: 2,
  },
  steps: [],
};
