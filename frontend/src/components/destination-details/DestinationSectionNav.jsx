"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Camera, Compass, Info, MapPin, Navigation, Star } from "lucide-react";

const sections = [
  {
    id: "destination-overview",
    label: "Overview",
    icon: Compass,
  },
  {
    id: "destination-gallery",
    label: "Photos",
    icon: Camera,
  },
  {
    id: "visitor-information",
    label: "Visitor information",
    icon: Info,
  },
  {
    id: "destination-map",
    label: "Location",
    icon: MapPin,
  },
  {
    id: "nearby-places",
    label: "Nearby places",
    icon: Navigation,
  },
  {
    id: "destination-reviews",
    label: "Reviews",
    icon: Star,
  },
];

export default function DestinationSectionNav() {
  const [activeSection, setActiveSection] = useState("destination-overview");

  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter(Boolean);

    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visibleEntries.length > 0) {
          setActiveSection(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: "-18% 0px -65% 0px",
        threshold: 0,
      },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  function handleNavigation(event, sectionId) {
    event.preventDefault();

    const target = document.getElementById(sectionId);

    if (!target) return;

    setActiveSection(sectionId);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <nav
      aria-label="Destination sections"
      className="
        sticky top-0 z-40
        -mx-4
        border-y border-[#E8E9E2]
        bg-[#FAF9F6]/95
        px-4
        shadow-[0_4px_16px_rgba(23,75,53,0.035)]
        backdrop-blur-xl
        sm:mx-0 sm:rounded-xl sm:border sm:px-2
      "
    >
      <div
        className="
          flex min-w-0 items-center gap-1
          overflow-x-auto overscroll-x-contain
          py-2
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
          sm:gap-2 sm:py-2.5
          md:grid md:grid-cols-3 md:gap-2
          xl:grid-cols-6
        "
      >
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <motion.a
              key={section.id}
              href={`#${section.id}`}
              onClick={(event) => handleNavigation(event, section.id)}
              aria-current={isActive ? "location" : undefined}
              whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.2,
                ease: "easeOut",
              }}
              className={`
                relative inline-flex min-h-10 shrink-0
                items-center justify-center gap-2
                whitespace-nowrap rounded-full
                px-3 py-2
                font-[family-name:var(--font-inter)]
                text-[11px] font-semibold
                outline-none
                transition-colors duration-300
                focus-visible:ring-2
                focus-visible:ring-[#D9A21B]
                focus-visible:ring-offset-2
                sm:px-4 sm:text-xs
                md:w-full md:min-w-0
                md:px-2 md:text-[11px]
                lg:px-3 lg:text-xs
                ${
                  isActive
                    ? "bg-[#174B35] text-white shadow-sm"
                    : "text-[#69766D] hover:bg-[#EDF1EB] hover:text-[#174B35]"
                }
              `}
            >
              <Icon size={15} strokeWidth={2} className="shrink-0" />

              <span>{section.label}</span>
            </motion.a>
          );
        })}
      </div>
    </nav>
  );
}
