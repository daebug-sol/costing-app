/**
 * Struktur bagian / sub-bagian (sub-assembly) untuk item manual.
 *
 * `ManualCostingGroup.subtotal` hanya berisi item milik bagian itu sendiri,
 * sehingga penjumlahan semua bagian (segmen, penawaran, dashboard) tidak dobel.
 * Total bertingkat untuk tampilan dihitung di sini dari subtotal yang sudah
 * tersimpan; tidak ada rumus harga baru.
 */

/** Bagian tingkat atas = 1, sub-bagian = 2, sub-sub-bagian = 3. */
export const MANUAL_GROUP_MAX_DEPTH = 3;

export type GroupLike = {
  id: string;
  parentId?: string | null;
  sortOrder: number;
  subtotal: number;
};

export type GroupNode<G extends GroupLike> = {
  group: G;
  depth: number;
  children: GroupNode<G>[];
  /** Subtotal bagian ini ditambah semua sub-bagiannya. */
  total: number;
};

/**
 * Bangun pohon bagian. Bagian yang induknya tidak ditemukan diperlakukan
 * sebagai bagian tingkat atas supaya datanya tetap tampil.
 */
export function buildGroupTree<G extends GroupLike>(groups: G[]): GroupNode<G>[] {
  const ids = new Set(groups.map((g) => g.id));
  const byParent = new Map<string | null, G[]>();
  for (const g of groups) {
    const parent = g.parentId && ids.has(g.parentId) && g.parentId !== g.id ? g.parentId : null;
    const list = byParent.get(parent) ?? [];
    list.push(g);
    byParent.set(parent, list);
  }
  const seen = new Set<string>();
  const build = (parent: string | null, depth: number): GroupNode<G>[] =>
    [...(byParent.get(parent) ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((g) => {
        if (seen.has(g.id)) return false;
        seen.add(g.id);
        return true;
      })
      .map((g) => {
        const children = build(g.id, depth + 1);
        const total = children.reduce((s, c) => s + c.total, Number(g.subtotal) || 0);
        return { group: g, depth, children, total };
      });
  return build(null, 1);
}

/** Urutan baca dari atas ke bawah: induk lalu anak-anaknya. */
export function flattenGroupTree<G extends GroupLike>(nodes: GroupNode<G>[]): GroupNode<G>[] {
  const out: GroupNode<G>[] = [];
  const walk = (list: GroupNode<G>[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** Bagian diurutkan induk-dulu (untuk penawaran yang tetap diratakan). */
export function orderGroupsDepthFirst<G extends GroupLike>(groups: G[]): G[] {
  return flattenGroupTree(buildGroupTree(groups)).map((n) => n.group);
}

/** Kedalaman bagian (1 = tingkat atas), atau 0 kalau tidak ditemukan. */
export function groupDepth<G extends GroupLike>(groups: G[], id: string): number {
  const byId = new Map(groups.map((g) => [g.id, g]));
  let depth = 0;
  let cur = byId.get(id);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    depth += 1;
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return depth;
}

export function canAddSubgroup<G extends GroupLike>(groups: G[], parentId: string): boolean {
  const d = groupDepth(groups, parentId);
  return d > 0 && d < MANUAL_GROUP_MAX_DEPTH;
}

export type MaterialUsage = { groupCount: number; totalQty: number };

/**
 * Pemakaian material yang sama di beberapa bagian, mis. baut M6 4 + 8 + 8 = 20.
 * Kunci = `sourceType:sourceId`.
 */
export function materialUsage(
  groups: { id: string; items: { sourceType: string; sourceId: string; qty: number }[] }[]
): Map<string, MaterialUsage> {
  const groupsByKey = new Map<string, Set<string>>();
  const qtyByKey = new Map<string, number>();
  for (const g of groups) {
    for (const it of g.items) {
      const key = `${it.sourceType}:${it.sourceId}`;
      const set = groupsByKey.get(key) ?? new Set<string>();
      set.add(g.id);
      groupsByKey.set(key, set);
      qtyByKey.set(key, (qtyByKey.get(key) ?? 0) + (Number(it.qty) || 0));
    }
  }
  const out = new Map<string, MaterialUsage>();
  for (const [key, set] of groupsByKey) {
    out.set(key, { groupCount: set.size, totalQty: qtyByKey.get(key) ?? 0 });
  }
  return out;
}
