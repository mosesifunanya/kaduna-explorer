"use client";

import { AnimatePresence, motion } from "motion/react";
import { Camera, ChevronLeft, ChevronRight, Images } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";

export default function DestinationGallery({
  destination,
  gallery = [],
  activeImage,
  setActiveImage,
  onOpenGallery,
}) {
  const hasImages = gallery.length > 0;
  const currentImage = gallery[activeImage] || gallery[0];

  const showPrevious = () => {
    setActiveImage(
      (current) => (current - 1 + gallery.length) % gallery.length,
    );
  };

  const showNext = () => {
    setActiveImage((current) => (current + 1) % gallery.length);
  };

  if (!hasImages) {
    return (
      <section
        id="destination-gallery"
        className="mx-auto flex aspect-[16/10] min-h-[230px] w-full items-center justify-center overflow-hidden rounded-2xl border border-[#E8E9E2] bg-[#F0F1EB] sm:aspect-[16/7] sm:min-h-[300px] lg:aspect-auto lg:h-[420px] lg:min-h-0 lg:max-w-[1400px] xl:h-[460px]"
      >
        <div className="flex flex-col items-center gap-3 px-5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#174B35] shadow-sm">
            <Camera size={21} />
          </div>
          <p className="font-[family-name:var(--font-inter)] text-xs font-medium text-[#78827B] sm:text-sm">
            Photos of this destination will be added soon.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="destination-gallery"
      aria-label={`${destination.name} photo gallery`}
      className="mx-auto w-full min-w-0 lg:max-w-[1000px]"
    >
      <div className="relative isolate aspect-[16/10] min-h-[230px] w-full overflow-hidden rounded-2xl bg-[#E9EAE4] sm:aspect-[16/8] sm:min-h-[320px] lg:aspect-auto lg:h-[420px] lg:min-h-0 xl:h-[460px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <OptimizedImage
              src={currentImage}
              alt={`${destination.name} photograph ${activeImage + 1}`}
              fill
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 90vw, 1000px"
              draggable="false"
              className="h-full w-full object-contain"
            />
          </motion.div>
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101820]/35 via-transparent to-[#101820]/10" />

        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-full border border-white/20 bg-[#14251D]/70 px-3 py-1.5 font-[family-name:var(--font-inter)] text-[10px] font-semibold text-white shadow-sm backdrop-blur-md sm:bottom-5 sm:left-5 sm:px-3.5 sm:py-2 sm:text-xs">
          <Camera size={13} />
          <span>
            {activeImage + 1} / {gallery.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenGallery}
          className="absolute bottom-3 right-3 z-20 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/30 bg-[#14251D]/75 px-3 py-1.5 font-[family-name:var(--font-inter)] text-[10px] font-semibold text-white shadow-sm backdrop-blur-md transition hover:bg-[#174B35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:bottom-5 sm:right-5 sm:min-h-9 sm:px-4 sm:text-xs"
        >
          <Images size={13} />
          View gallery
        </button>

        {gallery.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/90 text-[#174B35] shadow-md transition hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#174B35] sm:left-5 sm:h-11 sm:w-11"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={showNext}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/90 text-[#174B35] shadow-md transition hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#174B35] sm:right-5 sm:h-11 sm:w-11"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {gallery.length > 1 && (
        <div
          aria-label="Choose a destination photo"
          className="mt-3 flex min-w-0 gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]"
        >
          {gallery.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveImage(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-pressed={activeImage === index}
              className={`relative h-[52px] w-[72px] shrink-0 overflow-hidden rounded-lg border-2 bg-[#E9EAE4] transition sm:h-[64px] sm:w-[88px] ${
                activeImage === index
                  ? "border-[#174B35] opacity-100"
                  : "border-transparent opacity-65 hover:opacity-100"
              }`}
            >
              <OptimizedImage
                src={image}
                alt=""
                fill
                sizes="(max-width: 639px) 72px, 88px"
                loading="lazy"
                draggable="false"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
