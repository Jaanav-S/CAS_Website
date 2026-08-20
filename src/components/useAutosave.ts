"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "clean" | "dirty" | "saving" | "saved" | "error";

export type Snapshot<T> = { savedAt: number; values: T };

const PREFIX = "cas:draft:";

export function storageKey(id: string | undefined): string {
  return `${PREFIX}${id ?? "new"}`;
}

/** Reads a locally stored snapshot, ignoring anything corrupt. */
export function readSnapshot<T>(key: string): Snapshot<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot<T>;
    return typeof parsed?.savedAt === "number" && parsed.values ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSnapshot<T>(key: string, values: T): void {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ savedAt: Date.now(), values } satisfies Snapshot<T>),
    );
  } catch {
    // Private browsing or a full quota — the server autosave still covers us.
  }
}

export function clearSnapshot(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to do.
  }
}

/**
 * Whether two sets of form values are the same.
 *
 * Timestamps alone cannot decide if a local snapshot is worth restoring: the
 * flush on tab-close writes the snapshot *after* the last server save, so an
 * untouched form always looks "newer" than the server. Comparing the content
 * is what actually answers "are there unsaved changes?".
 */
export function sameValues<T extends object>(a: T, b: T): boolean {
  const stable = (v: T) =>
    JSON.stringify(
      Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y))),
    );
  return stable(a) === stable(b);
}

/** Moves the "new" snapshot onto the id the server just handed back. */
export function renameSnapshot(from: string, to: string): void {
  const snapshot = readSnapshot(from);
  if (snapshot) {
    try {
      window.localStorage.setItem(to, JSON.stringify(snapshot));
    } catch {
      // Ignore; the values are already in memory.
    }
  }
  clearSnapshot(from);
}

type Options<T> = {
  /** localStorage key; changes when a new draft gets its server id. */
  key: string;
  values: T;
  /** Pushes to the server. Omitted before the draft exists server-side. */
  save?: (values: T) => Promise<void>;
  /** Turn everything off once the work has been submitted. */
  enabled?: boolean;
  delay?: number;
};

/**
 * Keeps a form recoverable two ways: every keystroke lands in localStorage
 * immediately (survives a crash, a closed tab or a dropped connection), and a
 * debounced write goes to the server so the draft is there on any device.
 */
export function useAutosave<T>({
  key,
  values,
  save,
  enabled = true,
  delay = 1500,
}: Options<T>): {
  state: SaveState;
  lastSavedAt: Date | null;
  saveNow: () => Promise<void>;
} {
  const [state, setState] = useState<SaveState>("clean");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Kept in refs so the debounce timer always flushes the newest values
  // without having to be torn down and rebuilt on every keystroke.
  const latest = useRef(values);
  const saveRef = useRef(save);
  useEffect(() => {
    latest.current = values;
    saveRef.current = save;
  });

  // Skip the very first render: loading a form is not an edit.
  const primed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveNow = useCallback(async () => {
    if (!enabled) return;
    writeSnapshot(key, latest.current);

    const push = saveRef.current;
    if (!push) {
      // Nothing to sync to yet — the local write is the whole save, and it
      // has already happened, so this is genuinely saved.
      setState("saved");
      setLastSavedAt(new Date());
      return;
    }

    setState("saving");
    try {
      await push(latest.current);
      setState("saved");
      setLastSavedAt(new Date());
    } catch {
      // The local snapshot is already written, so nothing is lost.
      setState("error");
    }
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled) return;
    if (!primed.current) {
      primed.current = true;
      return;
    }

    // Local first and synchronously, so a crash in the next millisecond is safe.
    writeSnapshot(key, values);
    setState("dirty");

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveNow(), delay);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [values, key, delay, enabled, saveNow]);

  // Flush when the tab is hidden or closed — phones background tabs eagerly.
  useEffect(() => {
    if (!enabled) return;
    const flush = () => {
      writeSnapshot(key, latest.current);
      if (state === "dirty") void saveNow();
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [enabled, key, saveNow, state]);

  return { state, lastSavedAt, saveNow };
}
