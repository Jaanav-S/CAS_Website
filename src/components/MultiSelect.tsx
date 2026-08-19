"use client";

import { useEffect, useRef, useState } from "react";

export type Option = { value: string; label: string };

type Props = {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  /** Show a "Check All" row at the top of the list. */
  allowCheckAll?: boolean;
  /** Accessible name for the trigger; defaults to the placeholder. */
  ariaLabel?: string;
  id?: string;
};

/**
 * Checkbox dropdown used for the strands, learning outcomes and SDG pickers.
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  allowCheckAll = true,
  ariaLabel,
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const allChecked = value.length === options.length && options.length > 0;

  function toggle(optionValue: string) {
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue],
    );
  }

  // Listing names stays readable for short lists; only collapse to a summary
  // once spelling them all out would be noise.
  const summary =
    value.length === 0
      ? placeholder
      : allChecked && options.length > 3
        ? "All items checked"
        : options
            .filter((o) => value.includes(o.value))
            .map((o) => o.label)
            .join(", ");

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel ?? placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="select flex items-center justify-between gap-2 text-left"
      >
        <span
          className={`truncate ${value.length === 0 ? "italic text-muted" : ""}`}
        >
          {summary}
        </span>
        <span aria-hidden className="text-muted shrink-0">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable
          className="card absolute z-30 mt-1 max-h-72 w-full overflow-y-auto p-1"
        >
          {allowCheckAll && (
            <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2">
              <input
                type="checkbox"
                className="mt-0.5 accent-brand"
                checked={allChecked}
                onChange={() =>
                  onChange(allChecked ? [] : options.map((o) => o.value))
                }
              />
              <span className="font-medium">Check All</span>
            </label>
          )}
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2"
            >
              <input
                type="checkbox"
                className="mt-0.5 accent-brand"
                checked={value.includes(option.value)}
                onChange={() => toggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
