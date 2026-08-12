import type { OrgPlan } from "@prisma/client";

const PLANS: readonly OrgPlan[] = ["free", "standard", "enterprise"] as const;

export function isOrgPlan(value: unknown): value is OrgPlan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

export type OperatorOrgPatchInput = {
  plan?: OrgPlan;
  ahuModuleEnabled?: boolean;
};

export type OperatorOrgPatchResult =
  | { ok: true; data: { plan: OrgPlan; ahuModuleEnabled: boolean } }
  | { ok: false; error: string; code: "INVALID_ENTITLEMENTS" };

/**
 * Consistency:
 * - `plan: free` forces `ahuModuleEnabled = false`
 * - AHU on requires resulting `plan === enterprise`
 */
export function resolveOperatorOrgPatch(
  current: { plan: OrgPlan; ahuModuleEnabled: boolean },
  patch: OperatorOrgPatchInput
): OperatorOrgPatchResult {
  const nextPlan = patch.plan ?? current.plan;
  let nextAhu =
    patch.ahuModuleEnabled !== undefined
      ? patch.ahuModuleEnabled
      : current.ahuModuleEnabled;

  if (nextPlan === "free") {
    nextAhu = false;
  } else if (nextAhu && nextPlan !== "enterprise") {
    return {
      ok: false,
      error: "AHU module requires enterprise plan",
      code: "INVALID_ENTITLEMENTS",
    };
  }

  return {
    ok: true,
    data: { plan: nextPlan, ahuModuleEnabled: nextAhu },
  };
}
