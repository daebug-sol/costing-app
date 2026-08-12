"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import {
  ADMIN_ASSIGNABLE_ROLES,
  ORG_ROLE_LABELS,
  ORG_ROLES,
  type OrgRole,
} from "@/lib/org-roles";
import { toastError, toastSuccess } from "@/store/toastStore";

type MemberRow = {
  id: string;
  userId: string;
  role: OrgRole;
  roleLabel: string;
  createdAt: string;
};

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

export function OrgMembersCard({
  actorRole,
}: {
  actorRole: OrgRole;
}) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/org/members", { cache: "no-store" });
      if (!r.ok) throw new Error(await readErr(r));
      const data = (await r.json()) as { members: MemberRow[] };
      setMembers(data.members ?? []);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal memuat anggota");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const assignable: OrgRole[] =
    actorRole === "owner"
      ? [...ORG_ROLES]
      : [...ADMIN_ASSIGNABLE_ROLES];

  const onRoleChange = async (userId: string, role: OrgRole) => {
    setSavingUserId(userId);
    try {
      const r = await fetch("/api/org/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!r.ok) throw new Error(await readErr(r));
      const updated = (await r.json()) as MemberRow;
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === userId
            ? {
                ...m,
                role: updated.role,
                roleLabel: updated.roleLabel ?? ORG_ROLE_LABELS[updated.role],
              }
            : m
        )
      );
      toastSuccess("Peran anggota diperbarui");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Gagal mengubah peran");
      void load();
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <Card size="sm" className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Anggota</CardTitle>
        <CardDescription>
          Peran aplikasi di organisasi ini (terpisah dari undangan Clerk). Owner
          dapat menunjuk owner lain; admin tidak dapat mengubah owner.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada anggota tercatat. Undang via OrganizationSwitcher; peran
            default adalah Member.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">User ID</th>
                  <th className="py-2 pr-3 font-medium">Peran</th>
                  <th className="py-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-xs break-all">
                      {m.userId}
                    </td>
                    <td className="py-2 pr-3">
                      {ORG_ROLE_LABELS[m.role] ?? m.role}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <Select
                          value={m.role}
                          disabled={savingUserId === m.userId}
                          onValueChange={(v) => {
                            if (!v || v === m.role) return;
                            void onRoleChange(m.userId, v as OrgRole);
                          }}
                        >
                          <SelectTrigger
                            className="w-[160px]"
                            size="sm"
                            aria-label={`Peran untuk ${m.userId}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assignable.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ORG_ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {savingUserId === m.userId ? (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            Muat ulang
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
