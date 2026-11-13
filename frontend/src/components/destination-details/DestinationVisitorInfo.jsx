"use client";

import { motion } from "motion/react";
import {
  Clock3,
  Compass,
  ExternalLink,
  Globe,
  Heart,
  MapPin,
  Phone,
} from "lucide-react";

export default function DestinationVisitorInfo({
  locationLabel,
  categoryLabel,
  priceLabel,
  openingHours,
  phone,
  email,
  websiteUrl,
}) {
  const hasPrice =
    priceLabel &&
    String(priceLabel).trim() &&
    String(priceLabel).toLowerCase() !== "unknown";

  const information = [
    {
      icon: MapPin,
      label: "Location",
      value: locationLabel,
    },
    {
      icon: Compass,
      label: "Category",
      value: categoryLabel,
    },
    ...(hasPrice
      ? [
          {
            icon: Heart,
            label: "Price or entrance fee",
            value: priceLabel,
          },
        ]
      : []),
    ...(openingHours
      ? [
          {
            icon: Clock3,
            label: "Opening hours",
            value: openingHours,
          },
        ]
      : []),
    ...(phone
      ? [
          {
            icon: Phone,
            label: "Contact phone",
            value: phone,
            href: `tel:${phone}`,
          },
        ]
      : []),
    ...(email
      ? [
          {
            icon: Globe,
            label: "Email",
            value: email,
            href: `mailto:${email}`,
          },
        ]
      : []),
    ...(websiteUrl
      ? [
          {
            icon: ExternalLink,
            label: "Website",
            value: websiteUrl.replace(/^https?:\/\//i, ""),
            href: websiteUrl,
            external: true,
          },
        ]
      : []),
  ].filter(
    (item) =>
      item.value !== null &&
      item.value !== undefined &&
      String(item.value).trim() !== "",
  );

  return (
    <motion.aside
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.35 }}
      className="min-w-0 overflow-hidden rounded-2xl border border-[#E3E9E1] bg-white shadow-[0_5px_18px_rgba(23,75,53,0.04)]"
    >
      <div className="border-b border-white/10 bg-[#174B35] px-3.5 py-3 sm:px-4 sm:py-3.5">
        <p className="font-[family-name:var(--font-inter)] text-[8px] font-bold uppercase tracking-[0.18em] text-[#E9C56D] sm:text-[9px]">
          Plan your visit
        </p>

        <h2 className="mt-1 font-[family-name:var(--font-playfair)] text-lg font-semibold leading-tight text-white sm:text-xl">
          Visitor information
        </h2>

        <p className="mt-1 max-w-sm font-[family-name:var(--font-inter)] text-[10px] leading-4 text-white/75 sm:text-[11px]">
          Useful details to help you prepare for your visit.
        </p>
      </div>

      <div className="px-3.5 sm:px-4">
        {information.map((item, index) => {
          const Icon = item.icon;

          const content = (
            <>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5F5EF] text-[#B88B1C]">
                <Icon size={15} strokeWidth={1.8} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block font-[family-name:var(--font-inter)] text-[8px] font-medium uppercase tracking-[0.09em] text-[#829087] sm:text-[9px]">
                  {item.label}
                </span>

                <span className="mt-0.5 block break-words font-[family-name:var(--font-inter)] text-[10px] font-semibold leading-4 text-[#24352B] sm:text-[11px]">
                  {item.value}
                </span>
              </span>

              {item.href && (
                <ExternalLink size={12} className="shrink-0 text-[#9AA49C]" />
              )}
            </>
          );

          return (
            <div
              key={item.label}
              className={
                index < information.length - 1
                  ? "border-b border-[#EDF0EA]"
                  : ""
              }
            >
              {item.href ? (
                <a
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className="flex min-w-0 items-center gap-2.5 py-2.5 transition-colors hover:bg-[#FAFBF8]"
                >
                  {content}
                </a>
              ) : (
                <div className="flex min-w-0 items-center gap-2.5 py-2.5">
                  {content}
                </div>
              )}
            </div>
          );
        })}

        {information.length === 0 && (
          <p className="py-3 font-[family-name:var(--font-inter)] text-[10px] leading-5 text-[#78827B]">
            Visitor information has not been provided for this destination yet.
          </p>
        )}
      </div>
    </motion.aside>
  );
}
