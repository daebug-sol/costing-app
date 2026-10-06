"use client";

import { CostingLevelHeading } from "@/components/costing/costing-shell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import type { AhuEditor } from "./use-ahu-segment-editor";

export function AhuSectionsTab({ ed }: { ed: AhuEditor }) {
  const {
    seg,
    ahu,
    setCoil,
    setAccessDoor,
    setMixingBox,
    setFilters,
    setElectricHeater,
    setDamper,
    setOpening,
    setFan,
    scope,
    setScopeModule,
  } = ed;

  return (
    <>
          <TabsContent value="modules" className="flex flex-col gap-3">
            <CostingLevelHeading level="module" as="h4">
              Parameter modul
            </CostingLevelHeading>
            <Accordion type="multiple" className="w-full rounded-md border border-border px-4 sm:px-5">
                  <AccordionItem value="access-door">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-medium">Access Door</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mb-3 flex items-center gap-2">
                      <Checkbox
                        checked={scope.includeAccessDoor}
                        disabled={scope.isFullAhu}
                        onCheckedChange={(c) => {
                          if (typeof c !== "boolean") return;
                          setScopeModule("includeAccessDoor", c);
                        }}
                      />
                      <Label className="text-xs">Sertakan modul</Label>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          min={1}
                          className="h-8 w-20"
                          value={ahu.accessDoor?.qty ?? ""}
                          placeholder="1"
                          onChange={(e) =>
                            setAccessDoor({
                              qty:
                                e.target.value === ""
                                  ? undefined
                                  : Math.max(1, Math.floor(Number(e.target.value) || 1)),
                            })
                          }
                        />
                        <Label className="text-xs">H</Label>
                        <Input
                          type="number"
                          className="h-8 w-24"
                          value={ahu.accessDoor?.height ?? ""}
                          placeholder={String(seg.dimH ?? "")}
                          onChange={(e) => {
                            const v = e.target.value;
                            const n = v === "" ? NaN : Number(v);
                            setAccessDoor({
                              // 0 must not persist — finite(0, dimH) does not fall back.
                              height:
                                v === "" || !Number.isFinite(n) || n <= 0
                                  ? undefined
                                  : n,
                            });
                          }}
                        />
                        <Label className="text-xs">W</Label>
                        <Input
                          type="number"
                          className="h-8 w-24"
                          value={ahu.accessDoor?.width ?? ""}
                          placeholder={String(seg.dimW ?? "")}
                          onChange={(e) => {
                            const v = e.target.value;
                            const n = v === "" ? NaN : Number(v);
                            setAccessDoor({
                              width:
                                v === "" || !Number.isFinite(n) || n <= 0
                                  ? undefined
                                  : n,
                            });
                          }}
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={ahu.accessDoor?.withWindow === true}
                          onCheckedChange={(c) =>
                            setAccessDoor({ withWindow: c === true })
                          }
                        />
                        With window kit
                      </label>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="mixing-box">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-medium">Mixing Box</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mb-3 flex items-center gap-2">
                      <Checkbox
                        checked={scope.includeMixingBox}
                        disabled={scope.isFullAhu}
                        onCheckedChange={(c) => {
                          if (typeof c !== "boolean") return;
                          setScopeModule("includeMixingBox", c);
                        }}
                      />
                      <Label className="text-xs">Sertakan modul</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                        <Input
                          type="number"
                          className="h-8"
                          placeholder="FA Flow CMH"
                          value={ahu.mixingBox?.faFlowCMH ?? ""}
                          onChange={(e) =>
                            setMixingBox({
                              faFlowCMH:
                                e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="number"
                          className="h-8"
                          placeholder="RA Flow CMH"
                          value={ahu.mixingBox?.raFlowCMH ?? ""}
                          onChange={(e) =>
                            setMixingBox({
                              raFlowCMH:
                                e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="number"
                          className="h-8"
                          placeholder="FA W"
                          value={ahu.mixingBox?.faDamperW ?? ""}
                          onChange={(e) =>
                            setMixingBox({
                              faDamperW:
                                e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="number"
                          className="h-8"
                          placeholder="FA H"
                          value={ahu.mixingBox?.faDamperH ?? ""}
                          onChange={(e) =>
                            setMixingBox({
                              faDamperH:
                                e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="number"
                          className="h-8"
                          placeholder="RA W"
                          value={ahu.mixingBox?.raDamperW ?? ""}
                          onChange={(e) =>
                            setMixingBox({
                              raDamperW:
                                e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="number"
                          className="h-8"
                          placeholder="RA H"
                          value={ahu.mixingBox?.raDamperH ?? ""}
                          onChange={(e) =>
                            setMixingBox({
                              raDamperH:
                                e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Minimal isi 1 pasang damper (FA atau RA).
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="filters">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-medium">Filters</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mb-3 flex items-center gap-2">
                      <Checkbox
                        checked={scope.includeFilters}
                        disabled={scope.isFullAhu}
                        onCheckedChange={(c) => {
                          if (typeof c !== "boolean") return;
                          setScopeModule("includeFilters", c);
                        }}
                      />
                      <Label className="text-xs">Sertakan modul</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                        <Input
                          type="number"
                          min={0}
                          className="h-8"
                          placeholder="Panel qty"
                          value={ahu.filters?.panelQty ?? ""}
                          onChange={(e) =>
                            setFilters({
                              panelQty:
                                e.target.value === ""
                                  ? undefined
                                  : Math.max(0, Math.floor(Number(e.target.value) || 0)),
                            })
                          }
                        />
                        <Input
                          className="h-8"
                          placeholder="Panel class (G4)"
                          value={ahu.filters?.panelClass ?? ""}
                          onChange={(e) =>
                            setFilters({ panelClass: e.target.value || undefined })
                          }
                        />
                        <Input
                          type="number"
                          min={0}
                          className="h-8"
                          placeholder="Bag qty"
                          value={ahu.filters?.bagQty ?? ""}
                          onChange={(e) =>
                            setFilters({
                              bagQty:
                                e.target.value === ""
                                  ? undefined
                                  : Math.max(0, Math.floor(Number(e.target.value) || 0)),
                            })
                          }
                        />
                        <Input
                          className="h-8"
                          placeholder="Bag class (F8)"
                          value={ahu.filters?.bagClass ?? ""}
                          onChange={(e) => setFilters({ bagClass: e.target.value || undefined })}
                        />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Isi qty sesuai full/half size ekuivalen.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="coil">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-medium">Coil</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mb-3 flex items-center gap-2">
                      <Checkbox
                        checked={scope.includeCoil}
                        disabled={scope.isFullAhu}
                        onCheckedChange={(c) => {
                          if (typeof c !== "boolean") return;
                          setScopeModule("includeCoil", c);
                        }}
                      />
                      <Label className="text-xs">Sertakan modul</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                        <Input
                          type="number"
                          className="h-8"
                          placeholder={`FH (${seg.dimH ?? "H"})`}
                          value={ahu.coil?.FH ?? ""}
                          onChange={(e) =>
                            setCoil({ FH: e.target.value === "" ? undefined : Number(e.target.value) })
                          }
                        />
                        <Input
                          type="number"
                          className="h-8"
                          placeholder={`FL (${seg.dimW ?? "W"})`}
                          value={ahu.coil?.FL ?? ""}
                          onChange={(e) =>
                            setCoil({ FL: e.target.value === "" ? undefined : Number(e.target.value) })
                          }
                        />
                        <Input
                          type="number"
                          min={1}
                          className="h-8"
                          placeholder="Rows"
                          value={ahu.coil?.rows ?? ""}
                          onChange={(e) =>
                            setCoil({
                              rows: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="number"
                          min={1}
                          className="h-8"
                          placeholder="FPI"
                          value={ahu.coil?.FPI ?? ""}
                          onChange={(e) =>
                            setCoil({
                              FPI: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="number"
                          min={1}
                          className="h-8"
                          placeholder="Circuits"
                          value={ahu.coil?.circuits ?? ""}
                          onChange={(e) =>
                            setCoil({
                              circuits: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Model coil dari dimensi + rows/FPI/circuits.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="electric-heater">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-medium">Electric Heater</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mb-3 flex items-center gap-2">
                      <Checkbox
                        checked={scope.includeElectricHeater}
                        disabled={scope.isFullAhu}
                        onCheckedChange={(c) => {
                          if (typeof c !== "boolean") return;
                          setScopeModule("includeElectricHeater", c);
                        }}
                      />
                      <Label className="text-xs">Sertakan modul</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                        <Input
                          type="number"
                          className="h-8"
                          placeholder={`H (${seg.dimH ?? "H"})`}
                          value={ahu.electricHeater?.height ?? ""}
                          onChange={(e) =>
                            setElectricHeater({
                              height: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="number"
                          className="h-8"
                          placeholder={`W (${seg.dimW ?? "W"})`}
                          value={ahu.electricHeater?.width ?? ""}
                          onChange={(e) =>
                            setElectricHeater({
                              width: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="number"
                          className="h-8"
                          placeholder="Depth"
                          value={ahu.electricHeater?.depth ?? ""}
                          onChange={(e) =>
                            setElectricHeater({
                              depth: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="number"
                          min={1}
                          className="h-8"
                          placeholder="Steps"
                          value={ahu.electricHeater?.steps ?? ""}
                          onChange={(e) =>
                            setElectricHeater({
                              steps:
                                e.target.value === ""
                                  ? undefined
                                  : Math.max(1, Math.floor(Number(e.target.value) || 1)),
                            })
                          }
                        />
                        <Input
                          type="number"
                          className="h-8"
                          placeholder="Load kW"
                          value={ahu.electricHeater?.totalLoadKW ?? ""}
                          onChange={(e) =>
                            setElectricHeater({
                              totalLoadKW:
                                e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Estimasi fallback: load kW saat catalog heater belum tersedia.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="damper">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-medium">Damper</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mb-3 flex items-center gap-2">
                      <Checkbox
                        checked={scope.includeDamper}
                        disabled={scope.isFullAhu}
                        onCheckedChange={(c) => {
                          if (typeof c !== "boolean") return;
                          setScopeModule("includeDamper", c);
                        }}
                      />
                      <Label className="text-xs">Sertakan modul</Label>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          type="number"
                          className="h-8 w-28"
                          placeholder={`W (${seg.dimW ?? "—"})`}
                          value={ahu.damper?.W ?? ""}
                          onChange={(e) =>
                            setDamper({
                              W: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="number"
                          className="h-8 w-28"
                          placeholder={`H (${seg.dimH ?? "—"})`}
                          value={ahu.damper?.H ?? ""}
                          onChange={(e) =>
                            setDamper({
                              H: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={ahu.damper?.includeFA !== false}
                            onCheckedChange={(c) => {
                              if (c === "indeterminate") return;
                              setDamper({ includeFA: c === true, type: undefined });
                            }}
                          />
                          Fresh air (FA)
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={ahu.damper?.includeRA !== false}
                            onCheckedChange={(c) => {
                              if (c === "indeterminate") return;
                              setDamper({ includeRA: c === true, type: undefined });
                            }}
                          />
                          Return air (RA)
                        </label>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="opening">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-medium">Inlet/Outlet Opening</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mb-3 flex items-center gap-2">
                      <Checkbox
                        checked={scope.includeOpening}
                        disabled={scope.isFullAhu}
                        onCheckedChange={(c) => {
                          if (typeof c !== "boolean") return;
                          setScopeModule("includeOpening", c);
                        }}
                      />
                      <Label className="text-xs">Sertakan modul</Label>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          className="h-8 w-20"
                          placeholder="Qty"
                          value={ahu.opening?.qty ?? ""}
                          onChange={(e) =>
                            setOpening({
                              qty:
                                e.target.value === ""
                                  ? undefined
                                  : Math.max(1, Math.floor(Number(e.target.value) || 1)),
                            })
                          }
                        />
                        <Input
                          type="number"
                          className="h-8 w-28"
                          placeholder={`W (${seg.dimW ?? "—"})`}
                          value={ahu.opening?.width ?? ""}
                          onChange={(e) =>
                            setOpening({
                              width: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="number"
                          className="h-8 w-28"
                          placeholder={`H (${seg.dimH ?? "—"})`}
                          value={ahu.opening?.height ?? ""}
                          onChange={(e) =>
                            setOpening({
                              height: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={ahu.opening?.includeFlex === true}
                            onCheckedChange={(c) => setOpening({ includeFlex: c === true })}
                          />
                          Flexible connector
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={ahu.opening?.includeLouvre === true}
                            onCheckedChange={(c) => setOpening({ includeLouvre: c === true })}
                          />
                          Inlet louvre
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={ahu.opening?.includeWireGauze === true}
                            onCheckedChange={(c) => setOpening({ includeWireGauze: c === true })}
                          />
                          Wire gauze
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={ahu.opening?.includeActuator === true}
                            onCheckedChange={(c) => setOpening({ includeActuator: c === true })}
                          />
                          Actuator
                        </label>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="fan-motor">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-medium">Fan &amp; motor</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mb-3 flex items-center gap-2">
                      <Checkbox
                        checked={scope.includeFanMotor}
                        disabled={scope.isFullAhu}
                        onCheckedChange={(c) => {
                          if (typeof c !== "boolean") return;
                          setScopeModule("includeFanMotor", c);
                        }}
                      />
                      <Label className="text-xs">Sertakan modul</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                        <Input
                          className="h-8 lg:col-span-2"
                          placeholder="Fan model (kode)"
                          value={ahu.fanMotor?.fanModel ?? ""}
                          onChange={(e) => setFan({ fanModel: e.target.value || undefined })}
                        />
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-8"
                          placeholder="Motor kW"
                          value={ahu.fanMotor?.motorKW ?? ""}
                          onChange={(e) =>
                            setFan({
                              motorKW: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                        <Input
                          type="number"
                          min={2}
                          step={2}
                          className="h-8"
                          placeholder="Poles"
                          value={ahu.fanMotor?.motorPoles ?? ""}
                          onChange={(e) =>
                            setFan({
                              motorPoles:
                                e.target.value === ""
                                  ? undefined
                                  : Math.floor(Number(e.target.value)),
                            })
                          }
                        />
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        className="mt-1 h-8 w-28"
                        placeholder={`Qty default ${seg.qty}`}
                        value={ahu.fanMotor?.qty ?? ""}
                        onChange={(e) =>
                          setFan({
                            qty:
                              e.target.value === ""
                                ? undefined
                                : Math.max(1, Math.floor(Number(e.target.value) || 1)),
                          })
                        }
                      />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
            </Accordion>
          </TabsContent>
    </>
  );
}
