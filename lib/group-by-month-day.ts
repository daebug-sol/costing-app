/** Group rows by calendar month, then by day (newest first). */
export function groupByMonthAndDay<T>(
  items: T[],
  getDate: (row: T) => Date
): { monthKey: string; monthLabel: string; days: { dayKey: string; dayLabel: string; items: T[] }[] }[] {
  const sorted = [...items].sort(
    (a, b) => getDate(b).getTime() - getDate(a).getTime()
  );

  const monthMap = new Map<
    string,
    { monthLabel: string; dayMap: Map<string, T[]> }
  >();

  for (const row of sorted) {
    const d = getDate(row);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const monthKey = `${y}-${String(m).padStart(2, "0")}`;
    const dayKey = `${monthKey}-${String(day).padStart(2, "0")}`;

    const monthLabel = d.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { monthLabel, dayMap: new Map() });
    }
    const entry = monthMap.get(monthKey)!;
    if (!entry.dayMap.has(dayKey)) {
      entry.dayMap.set(dayKey, []);
    }
    entry.dayMap.get(dayKey)!.push(row);
  }

  const months = [...monthMap.entries()].sort((a, b) =>
    b[0].localeCompare(a[0])
  );

  return months.map(([monthKey, { monthLabel, dayMap }]) => {
    const days = [...dayMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dayKey, dayItems]) => {
        const first = dayItems[0];
        const d = getDate(first);
        const dayLabel = d.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        return { dayKey, dayLabel, items: dayItems };
      });
    return { monthKey, monthLabel, days };
  });
}
