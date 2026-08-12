"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrgPlan } from "@/lib/org-entitlements";
import { toastError, toastSuccess } from "@/store/toastStore";

type OperatorOrg = {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  ahuModuleEnabled: boolean;
  createdAt: string;
};

type Draft = {
  plan: OrgPlan;
  ahuModuleEnabled: boolean;
};

const PLAN_OPTIONS: { value: OrgPlan; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "standard", label: "Standard" },
  { value: "enterprise", label: "Enterprise" },
];

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

function draftFromOrg(org: OperatorOrg): Draft {
  return { plan: org.plan, ahuModuleEnabled: org.ahuModuleEnabled };
}

export function OperatorConsole() {
  const [orgs, setOrgs] = useState<OperatorOrg[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const r = await fetch("/api/operator/orgs", { cache: "no-store" });
      if (r.status === 401 || r.status === 403) {
        setDenied(true);
        setOrgs([]);
        return;
      }
      if (!r.ok) throw new Error(await readErr(r));
      const data = (await r.json()) as { orgs: OperatorOrg[] };
      const list = data.orgs ?? [];
      setOrgs(list);
      const next: Record<string, Draft> = {};
      for (const org of list) next[org.id] = draftFromOrg(org);
      setDrafts(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => {
      const base = prev[id] ?? { plan: "free" as OrgPlan, ahuModuleEnabled: false };
      const next = { ...base, ...patch };
      // Mirror server rule in UI: free clears AHU.
      if (next.plan === "free") next.ahuModuleEnabled = false;
      return { ...prev, [id]: next };
    });
  };

  const save = async (org: OperatorOrg) => {
    const draft = drafts[org.id] ?? draftFromOrg(org);
    setSavingId(org.id);
    try {
      const r = await fetch(`/api/operator/orgs/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: draft.plan,
          ahuModuleEnabled: draft.ahuModuleEnabled,
        }),
      });
      if (!r.ok) throw new Error(await readErr(r));
      const updated = (await r.json()) as OperatorOrg;
      setOrgs((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setDrafts((prev) => ({ ...prev, [updated.id]: draftFromOrg(updated) }));
      toastSuccess("Entitlements disimpan");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSavingId(null);
    }
  };

  if (denied) {
    return (
      <PageShell
        width="wide"
        eyebrow="Platform"
        title="Operator"
        description="Kelola plan dan modul AHU per organisasi"
        contentClassName="flex flex-col gap-6 lg:py-8"
      >
        <Card>
          <CardHeader>
            <CardTitle>Akses ditolak</CardTitle>
            <CardDescription>
              Akun Anda tidak ada di allowlist operator platform.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageShell>
    );
  }

  if (error && !loading && orgs.length === 0) {
    return (
      <PageShell
        width="wide"
        eyebrow="Platform"
        title="Operator"
        description="Kelola plan dan modul AHU per organisasi"
        contentClassName="flex flex-col gap-6 lg:py-8"
      >
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-foreground">{error}</p>
          <Button type="button" className="mt-4 gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" />
            Coba lagi
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      width="wide"
      eyebrow="Platform"
      title="Operator"
      description="Kelola plan dan modul AHU per organisasi"
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Muat ulang
        </Button>
      }
      contentClassName="flex flex-col gap-6 lg:py-8"
    >
      <Card>
        <CardHeader>
          <CardTitle>Organisasi</CardTitle>
          <CardDescription>
            Plan Free mematikan AHU. AHU hanya boleh aktif pada Enterprise.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && orgs.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat…
            </div>
          ) : orgs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Belum ada organisasi.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>AHU</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => {
                  const draft = drafts[org.id] ?? draftFromOrg(org);
                  const dirty =
                    draft.plan !== org.plan ||
                    draft.ahuModuleEnabled !== org.ahuModuleEnabled;
                  const saving = savingId === org.id;
                  return (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium whitespace-normal">
                        {org.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {org.slug}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={draft.plan}
                          onValueChange={(v) => {
                            if (!v) return;
                            setDraft(org.id, { plan: v as OrgPlan });
                          }}
                          disabled={saving}
                        >
                          <SelectTrigger size="sm" aria-label={`Plan ${org.name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAN_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={draft.ahuModuleEnabled}
                          disabled={saving || draft.plan === "free"}
                          onCheckedChange={(checked) =>
                            setDraft(org.id, { ahuModuleEnabled: checked })
                          }
                          aria-label={`AHU ${org.name}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!dirty || saving}
                          onClick={() => void save(org)}
                        >
                          {saving ? (
                            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                          ) : null}
                          Simpan
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
