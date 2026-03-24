/** Prisma include tree for `CostingProject` detail (segments → sections / manual). */
export const costingProjectDetailInclude = {
  segments: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          lineItems: { orderBy: { sortOrder: "asc" as const } },
        },
      },
      manualGroups: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          items: { orderBy: { sortOrder: "asc" as const } },
        },
      },
    },
  },
} as const;
