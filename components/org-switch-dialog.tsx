"use client";

import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { Building2, Check } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError } from "@/store/toastStore";

/** Org switcher opened from the account menu. Reloads after switching so no data from the previous org stays on screen. */
export function OrgSwitchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { organization } = useOrganization();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const [pendingId, setPendingId] = useState<string | null>(null);

  const choose = async (orgId: string) => {
    if (!setActive || orgId === organization?.id) {
      onOpenChange(false);
      return;
    }
    setPendingId(orgId);
    try {
      await setActive({ organization: orgId });
      window.location.assign("/");
    } catch {
      setPendingId(null);
      toastError(t("nav.orgSwitchError"));
    }
  };

  const memberships = userMemberships?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="org-switch-dialog">
        <DialogHeader>
          <DialogTitle>{t("nav.orgSwitchTitle")}</DialogTitle>
          <DialogDescription>{t("nav.orgSwitchBody")}</DialogDescription>
        </DialogHeader>
        {!isLoaded || userMemberships?.isLoading ? (
          <div className="space-y-2" aria-label={t("nav.orgLoading")}>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
            {memberships.map(({ organization: org }) => {
              const active = org.id === organization?.id;
              return (
                <li key={org.id}>
                  <button
                    type="button"
                    onClick={() => void choose(org.id)}
                    disabled={pendingId !== null}
                    aria-current={active ? "true" : undefined}
                    className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none disabled:opacity-50 aria-[current=true]:bg-primary/10"
                  >
                    {org.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Clerk-hosted avatar, size fixed
                      <img
                        src={org.imageUrl}
                        alt=""
                        className="size-8 shrink-0 rounded-md"
                      />
                    ) : (
                      <Building2
                        className="size-8 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {org.name}
                    </span>
                    {active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Check className="size-4" aria-hidden />
                        {t("nav.orgActive")}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
