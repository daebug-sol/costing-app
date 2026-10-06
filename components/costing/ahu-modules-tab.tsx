"use client";

import { Loader2 } from "lucide-react";
import { CostingLevelHeading } from "@/components/costing/costing-shell";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { normalizeSectionLayout } from "@/lib/ahu-recalc-params";
import { AHU_COSTING_MODULE_TOGGLES, PROFILE_OPTIONS } from "./costing-workspace-shared";
import type { AhuEditor } from "./use-ahu-segment-editor";

export function AhuModulesTab({ ed }: { ed: AhuEditor }) {
  const { t } = useI18n();
  const {
    seg,
    patchSegment,
    saveAhuParams,
    saveAhuParamsAndRecalculate,
    segmentActionsDisabled,
    ahuModuleEnabled,
    isCalculating,
    showToast,
    ahu,
    setAhu,
    nSec,
    sectionLayout,
    dimLabel,
    scope,
    setFullAhuSwitch,
    setScopeModule,
  } = ed;

  return (
    <>
          <TabsContent value="unit" className="flex flex-col gap-4">
          <CostingLevelHeading level="segment" as="h4">
            Parameter unit AHU
          </CostingLevelHeading>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor={`nsec-${seg.id}`} className="text-xs">
                  Jumlah section
                </Label>
                <Input
                  id={`nsec-${seg.id}`}
                  type="number"
                  min={1}
                  max={8}
                  className="h-8 w-24"
                  value={nSec}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAhu((p) => ({
                      ...p,
                      nSections:
                        v === ""
                          ? undefined
                          : Math.min(
                              8,
                              Math.max(1, Math.floor(Number(v) || 1))
                            ),
                    }));
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor={`seclayout-${seg.id}`} className="text-xs">
                  Tata letak section
                </Label>
                <Select
                  value={sectionLayout}
                  onValueChange={(v) => {
                    setAhu((p) => ({
                      ...p,
                      sectionLayout: normalizeSectionLayout(v),
                    }));
                  }}
                >
                  <SelectTrigger
                    id={`seclayout-${seg.id}`}
                    className="h-8 w-[11.5rem] text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">
                      Horizontal (samping)
                    </SelectItem>
                    <SelectItem value="vertical">
                      Vertical (atas-bawah)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {nSec > 1 && (
              <div className="flex flex-col gap-2">
                <ul className="divide-y divide-border rounded-md border border-border">
                  {Array.from({ length: nSec }, (_, i) => (
                    <li
                      key={`sec-row-${i + 1}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm"
                    >
                      <span className="min-w-[5.5rem] font-medium">
                        Section {i + 1}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        H {dimLabel(seg.dimH)} mm
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        W {dimLabel(seg.dimW)} mm
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        D {dimLabel(seg.dimD)} mm
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground text-xs">
                  Frame &amp; Panel, Skid, dan Structure dihitung × jumlah
                  section; modul lain tetap satu unit.
                </p>
                <p className="text-muted-foreground text-xs">
                  Formula skid belum dibedakan per tata letak; nilai tersimpan
                  untuk perhitungan nanti.
                </p>
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">AHU model</Label>
              <Input
                defaultValue={seg.ahuModel ?? ""}
                key={`am-${seg.id}-${seg.ahuModel}`}
                onBlur={(e) =>
                  patchSegment(seg.id, { ahuModel: e.target.value || null })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">AHU ref</Label>
              <Input
                defaultValue={seg.ahuRef ?? ""}
                key={`ar-${seg.id}-${seg.ahuRef}`}
                onBlur={(e) =>
                  patchSegment(seg.id, { ahuRef: e.target.value || null })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Flow CMH</Label>
              <Input
                type="number"
                defaultValue={seg.flowCMH ?? ""}
                key={`fl-${seg.id}-${seg.flowCMH}`}
                onBlur={(e) =>
                  patchSegment(seg.id, {
                    flowCMH:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Qty (fan dsb.)</Label>
              <Input
                type="number"
                defaultValue={seg.qty}
                key={`qt-${seg.id}-${seg.qty}`}
                onBlur={(e) =>
                  patchSegment(seg.id, {
                    qty: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Profile type</Label>
              <Select
                value={seg.profileType || PROFILE_OPTIONS[0].value}
                onValueChange={(v) => patchSegment(seg.id, { profileType: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {seg.profileType &&
                    !PROFILE_OPTIONS.some((o) => o.value === seg.profileType) && (
                      <SelectItem value={seg.profileType}>
                        {seg.profileType}
                      </SelectItem>
                    )}
                  {PROFILE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">H mm</Label>
              <Input
                type="number"
                className="w-28"
                defaultValue={seg.dimH ?? ""}
                key={`h-${seg.id}-${seg.dimH}`}
                onBlur={(e) =>
                  patchSegment(seg.id, {
                    dimH: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">W mm</Label>
              <Input
                type="number"
                className="w-28"
                defaultValue={seg.dimW ?? ""}
                key={`w-${seg.id}-${seg.dimW}`}
                onBlur={(e) =>
                  patchSegment(seg.id, {
                    dimW: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">D mm</Label>
              <Input
                type="number"
                className="w-28"
                defaultValue={seg.dimD ?? ""}
                key={`d-${seg.id}-${seg.dimD}`}
                onBlur={(e) =>
                  patchSegment(seg.id, {
                    dimD: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={isCalculating || segmentActionsDisabled}
                onClick={() =>
                  saveAhuParams(seg.id, ahu).catch((e) =>
                    showToast(String(e))
                  )
                }
              >
                Simpan parameter
              </Button>
              {ahuModuleEnabled ? (
                <Button
                  type="button"
                  className="gap-2"
                  disabled={isCalculating || segmentActionsDisabled}
                  onClick={() =>
                    saveAhuParamsAndRecalculate(seg.id, ahu).catch((e) =>
                      showToast(String(e))
                    )
                  }
                >
                  {isCalculating ? (
                    <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                  ) : null}
                  Hitung ulang
                </Button>
              ) : null}
            </div>
          </div>

          <div className="border-border space-y-3 border-t pt-4">
            <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Modul costing AHU
            </h4>
            <p className="text-muted-foreground max-w-xl text-xs leading-relaxed">
              {t("costing.scope.fullAhuHint")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Switch
                id={`ahu-full-${seg.id}`}
                checked={scope.isFullAhu}
                onCheckedChange={(v) => setFullAhuSwitch(v)}
              />
              <Label
                htmlFor={`ahu-full-${seg.id}`}
                className="cursor-pointer text-sm font-medium"
              >
                Full AHU (semua modul)
              </Label>
            </div>
            {!scope.isFullAhu && (
              <div className="bg-muted/30 rounded-lg border border-border p-3">
                <p className="text-muted-foreground mb-2 text-xs font-medium">
                  {t("costing.scope.selectedGroups")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {AHU_COSTING_MODULE_TOGGLES.map(({ key, label }) => {
                    const modId = `ahu-mod-${seg.id}-${key}`;
                    return (
                      <label
                        key={key}
                        htmlFor={modId}
                        className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5"
                      >
                        <Checkbox
                          id={modId}
                          checked={scope[key]}
                          onCheckedChange={(c) => {
                            if (typeof c !== "boolean") return;
                            setScopeModule(key, c);
                          }}
                        />
                        <span className="text-sm select-none">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          </TabsContent>
    </>
  );
}
