"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchLessons } from "@/lib/help/catalog";
import { lessonKey } from "@/content/help/types";

export function HelpSearch() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchLessons(query), [query]);

  return (
    <div className="flex flex-col gap-3" data-testid="help-search">
      <label htmlFor="help-search-input" className="sr-only">
        Cari bantuan
      </label>
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          id="help-search-input"
          type="search"
          placeholder="Cari pelajaran, misalnya ekspor atau folder…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          autoComplete="off"
        />
      </div>
      {query.trim() ? (
        <ul
          className="flex flex-col gap-1 rounded-lg border border-border bg-card p-2"
          role="listbox"
          aria-label="Hasil pencarian bantuan"
        >
          {results.length === 0 ? (
            <li className="text-muted-foreground px-2 py-3 text-sm">
              Tidak ada hasil
            </li>
          ) : (
            results.map((lesson) => {
              const key = lessonKey(lesson.track, lesson.slug);
              return (
                <li key={key}>
                  <Link
                    href={`/help/${lesson.track}/${lesson.slug}`}
                    className="hover:bg-accent block rounded-md px-2 py-2 text-sm transition-colors"
                    role="option"
                  >
                    <span className="font-medium text-foreground">
                      {lesson.title}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">
                      {lesson.summary}
                    </span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
