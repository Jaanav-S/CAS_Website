"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SearchHit } from "@/lib/search";

/**
 * A single keyword box for staff overviews. Searches reflections and CAS
 * projects by title or by the name of any student involved.
 */
export function SearchBox() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (query.length < 2) return;
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setHits(Array.isArray(data.results) ? data.results : []);
        setTouched(true);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  return (
    <div className="card p-4">
      <label className="label" htmlFor="staff-search">
        Search reflections & projects
      </label>
      <input
        id="staff-search"
        className="input"
        placeholder="A title, or a student's name…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (e.target.value.trim().length < 2) setHits([]);
        }}
        autoComplete="off"
      />

      {q.trim().length >= 2 && (
        <div className="mt-3">
          {busy && hits.length === 0 ? (
            <p className="hint">Searching…</p>
          ) : hits.length === 0 ? (
            touched && <p className="hint">Nothing matches “{q.trim()}”.</p>
          ) : (
            <ul className="divide-y">
              {hits.map((hit) => (
                <li key={`${hit.kind}-${hit.id}`}>
                  <Link
                    href={hit.href}
                    className="flex flex-wrap items-center gap-2 py-2 hover:text-brand"
                  >
                    <span
                      className={`badge ${hit.kind === "project" ? "badge-pending" : "badge-info"}`}
                    >
                      {hit.kind === "project" ? "Project" : "Reflection"}
                    </span>
                    <span className="font-semibold">{hit.title}</span>
                    <span className="hint">
                      {hit.people}
                      {hit.sectionName && ` · ${hit.sectionName}`} · {hit.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
