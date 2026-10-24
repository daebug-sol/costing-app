import {
  MANUAL_GROUP_MAX_DEPTH,
  buildGroupTree,
  canAddSubgroup,
  groupDepth,
  materialUsage,
  orderGroupsDepthFirst,
} from "@/lib/manual-group-tree";

const g = (id: string, parentId: string | null, sortOrder: number, subtotal: number) => ({
  id,
  parentId,
  sortOrder,
  subtotal,
});

// Meja: alas (4 baut), kaki (8 baut) dengan sub-bagian tapak (8 baut).
const table = [
  g("tapak", "kaki", 0, 8_000),
  g("kaki", null, 1, 8_000),
  g("alas", null, 0, 4_000),
];

describe("buildGroupTree", () => {
  it("nests sub-bagian under their parent in sortOrder", () => {
    const tree = buildGroupTree(table);
    expect(tree.map((n) => n.group.id)).toEqual(["alas", "kaki"]);
    expect(tree[1].children.map((n) => n.group.id)).toEqual(["tapak"]);
    expect(tree[1].children[0].depth).toBe(2);
  });

  it("rolls sub-bagian totals into the parent without changing own subtotal", () => {
    const tree = buildGroupTree(table);
    expect(tree[1].total).toBe(16_000);
    expect(tree[1].group.subtotal).toBe(8_000);
    const grand = tree.reduce((s, n) => s + n.total, 0);
    const sumOwn = table.reduce((s, x) => s + x.subtotal, 0);
    expect(grand).toBe(sumOwn);
  });

  it("treats orphans and self-parents as top level", () => {
    const tree = buildGroupTree([g("a", "missing", 0, 1), g("b", "b", 1, 2)]);
    expect(tree.map((n) => n.group.id)).toEqual(["a", "b"]);
  });
});

describe("orderGroupsDepthFirst", () => {
  it("lists each parent before its children", () => {
    expect(orderGroupsDepthFirst(table).map((x) => x.id)).toEqual(["alas", "kaki", "tapak"]);
  });

  it("keeps legacy groups without parentId in sortOrder", () => {
    const legacy = [
      { id: "b", sortOrder: 1, subtotal: 0 },
      { id: "a", sortOrder: 0, subtotal: 0 },
    ];
    expect(orderGroupsDepthFirst(legacy).map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("depth limit", () => {
  it("computes depth and blocks a fourth level", () => {
    const deep = [g("l1", null, 0, 0), g("l2", "l1", 0, 0), g("l3", "l2", 0, 0)];
    expect(groupDepth(deep, "l3")).toBe(MANUAL_GROUP_MAX_DEPTH);
    expect(canAddSubgroup(deep, "l2")).toBe(true);
    expect(canAddSubgroup(deep, "l3")).toBe(false);
    expect(canAddSubgroup(deep, "nope")).toBe(false);
  });
});

describe("materialUsage", () => {
  it("sums the same material across bagian", () => {
    const bolt = { sourceType: "material", sourceId: "m6" };
    const usage = materialUsage([
      { id: "alas", items: [{ ...bolt, qty: 4 }] },
      { id: "kaki", items: [{ ...bolt, qty: 8 }] },
      { id: "tapak", items: [{ ...bolt, qty: 8 }, { sourceType: "material", sourceId: "x", qty: 1 }] },
    ]);
    expect(usage.get("material:m6")).toEqual({ groupCount: 3, totalQty: 20 });
    expect(usage.get("material:x")).toEqual({ groupCount: 1, totalQty: 1 });
  });
});
