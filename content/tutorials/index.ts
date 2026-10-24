import { routeMatches } from "@/lib/tour/machine";
import type { TourDefinition, TourKey } from "@/lib/tour/types";
import { costingTour } from "./costing";
import { dashboardTour } from "./dashboard";
import { databaseTour } from "./database";
import { documentationTour } from "./documentation";
import { helpTour } from "./help";
import {
  customersTour,
  invoicesTour,
  paymentsTour,
  salesOrdersTour,
} from "./o2c";
import { settingsTour } from "./settings";
import { welcomeTour } from "./welcome";

/** Every tutorial, by key. Module PRs fill their own file's steps only. */
export const TUTORIALS: Record<TourKey, TourDefinition> = {
  welcome: welcomeTour,
  costing: costingTour,
  dashboard: dashboardTour,
  database: databaseTour,
  documentation: documentationTour,
  customers: customersTour,
  "sales-orders": salesOrdersTour,
  invoices: invoicesTour,
  payments: paymentsTour,
  settings: settingsTour,
  help: helpTour,
};

/** Module tutorial whose route matches; "/" matches only the dashboard itself. */
export function tutorialForRoute(pathname: string): TourDefinition | null {
  return (
    Object.values(TUTORIALS).find(
      (def) => def.route !== undefined && routeMatches(def.route, pathname)
    ) ?? null
  );
}
