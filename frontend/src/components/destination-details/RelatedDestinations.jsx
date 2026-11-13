"use client";

import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import DestinationCard from "@/components/DestinationCard";

export default function RelatedDestinations({ relatedDestinations = [] }) {
  const shouldReduceMotion = useReducedMotion();

  if (!Array.isArray(relatedDestinations) || relatedDestinations.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="related-destinations-heading"
      className="mt-10 border-t border-[#EAE7DF] pt-8 sm:mt-14 sm:pt-10"
    >
      {/* Section heading */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E9F2E8] text-[#174B35] sm:h-12 sm:w-12 sm:rounded-2xl">
            <Compass size={22} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#24714C] sm:text-xs">
              Keep exploring
            </p>

            <h2
              id="related-destinations-heading"
              className="mt-1 text-xl font-bold leading-tight text-[#192A35] sm:text-2xl"
            >
              You may also like
            </h2>

            <p className="mt-2 max-w-xl text-xs leading-5 text-[#707B82] sm:text-sm sm:leading-6">
              Discover more destinations worth exploring across Kaduna State.
            </p>
          </div>
        </div>

        <Link
          href="/explore"
          className="group inline-flex w-fit shrink-0 items-center gap-2 text-xs font-bold text-[#174B35] transition-colors duration-300 hover:text-[#A96816] sm:text-sm"
        >
          Explore all destinations
          <ArrowRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      </div>

      {/* Related destination cards */}

      <div className="mt-6 grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {relatedDestinations.map((destination, index) => {
          const key =
            destination?.slug ||
            destination?.id ||
            destination?._id ||
            `related-destination-${index}`;

          return (
            <motion.div
              key={String(key)}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
              whileInView={
                shouldReduceMotion ? undefined : { opacity: 1, y: 0 }
              }
              viewport={{
                once: true,
                amount: 0.12,
              }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.5,
                ease: [0.22, 1, 0.36, 1],
                delay: shouldReduceMotion ? 0 : Math.min(index * 0.1, 0.4),
              }}
              className="min-w-0"
            >
              <DestinationCard destination={destination} />
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
