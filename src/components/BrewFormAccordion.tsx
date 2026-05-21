"use client";

import type { ReactNode } from "react";

type BrewFormAccordionProps = {
  title: string;
  children: ReactNode;
  /** 初期表示で開く（HTML の open 属性） */
  defaultOpen?: boolean;
  description?: string;
  /** 見出し右側（レシオバッジなど） */
  trailing?: ReactNode;
  className?: string;
  /** カッピング時の挽き目など強調枠 */
  highlighted?: boolean;
};

function AccordionChevron() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0 text-amber-800/75 transition-transform duration-200 group-open:rotate-180"
      aria-hidden
    >
      <path d="M5 7.5L10 12.5L15 7.5" />
    </svg>
  );
}

export default function BrewFormAccordion({
  title,
  children,
  defaultOpen = false,
  description,
  trailing,
  className = "",
  highlighted = false
}: BrewFormAccordionProps) {
  return (
    <details
      className={`group rounded-2xl border bg-amber-50/50 p-5 open:shadow-sm ${
        highlighted
          ? "border-2 border-amber-500 shadow-md shadow-amber-900/10"
          : "border border-amber-200"
      } ${className}`}
      open={defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-amber-900 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block">{title}</span>
          {description ? (
            <span className="mt-1 block text-xs font-normal leading-relaxed text-amber-900/75">
              {description}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {trailing}
          <AccordionChevron />
        </span>
      </summary>
      <div className="mt-4 border-t border-amber-200/60 pt-4">{children}</div>
    </details>
  );
}
