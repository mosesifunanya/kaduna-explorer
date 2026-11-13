"use client";

import { ExternalLink } from "lucide-react";

export default function DestinationInfoItem({
  icon: Icon,
  label,
  value,
  href,
  external = false,
}) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3F5EF] text-[#A87912] sm:h-10 sm:w-10">
        {Icon && <Icon size={17} strokeWidth={1.8} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-[family-name:var(--font-inter)] text-[9px] font-medium uppercase tracking-[0.12em] text-[#929B93] sm:text-[10px]">
          {label}
        </span>

        <span className="mt-1 block break-words font-[family-name:var(--font-inter)] text-[11px] font-semibold leading-5 text-[#344B3D] sm:text-xs sm:leading-6">
          {value}
        </span>
      </span>

      {href && <ExternalLink size={14} className="shrink-0 text-[#9BA69D]" />}
    </>
  );

  const baseClassName = "flex min-w-0 items-center gap-3 py-3";

  if (href) {
    const isExternal = external || /^https?:\/\//i.test(href);

    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={`${baseClassName} rounded-lg transition-colors hover:bg-[#F8F9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#174B35]`}
      >
        {content}
      </a>
    );
  }

  return <div className={baseClassName}>{content}</div>;
}
