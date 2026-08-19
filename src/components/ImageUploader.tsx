"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  hint?: string;
  required?: boolean;
};

/** Uploads one image to /api/upload and reports back its public URL. */
export function ImageUploader({ value, onChange, label, hint, required }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <span className="label">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>

      {value ? (
        <div className="relative overflow-hidden rounded-lg border">
          <Image
            src={value}
            alt=""
            width={1200}
            height={640}
            className="h-48 w-full object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="btn btn-sm btn-danger absolute right-2 top-2"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-surface-2 text-sm text-muted transition hover:border-brand hover:text-brand disabled:opacity-60"
        >
          <span className="text-xl" aria-hidden>
            ＋
          </span>
          {busy ? "Uploading…" : "Choose an image"}
        </button>
      )}

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {hint && !error && <p className="hint mt-1">{hint}</p>}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
