import { ChevronLeft, ChevronRight, X } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";

export default function DestinationGalleryViewer({
  destinationName,
  gallery,
  activeImage,
  setActiveImage,
  onClose,
}) {
  if (!gallery?.length) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${destinationName} photo gallery`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101820]/95 p-3 sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close gallery"
        className="absolute right-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 sm:right-6 sm:top-6"
      >
        <X size={23} />
      </button>

      <div className="flex max-h-full w-full max-w-6xl flex-col items-center">
        <div className="mb-3 flex w-full items-center justify-between gap-3 text-sm text-white/80 sm:mb-4">
          <span className="truncate font-semibold text-white">
            {destinationName}
          </span>

          <span className="shrink-0">
            {activeImage + 1} / {gallery.length}
          </span>
        </div>

        <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
          <OptimizedImage
            src={gallery[activeImage]}
            alt={`${destinationName} photo ${activeImage + 1}`}
            sizes="(max-width: 639px) 100vw, 1152px"
            loading="eager"
            fetchPriority="high"
            className="max-h-[72vh] max-w-full rounded-xl object-contain sm:max-h-[76vh]"
          />

          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  setActiveImage(
                    (current) =>
                      (current - 1 + gallery.length) % gallery.length,
                  );
                }}
                aria-label="Previous gallery photo"
                className="absolute left-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition hover:bg-black/70 sm:left-3 sm:h-12 sm:w-12"
              >
                <ChevronLeft size={24} />
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  setActiveImage((current) => (current + 1) % gallery.length);
                }}
                aria-label="Next gallery photo"
                className="absolute right-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition hover:bg-black/70 sm:right-3 sm:h-12 sm:w-12"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>

        {gallery.length > 1 && (
          <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-2 sm:mt-5">
            {gallery.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={`Select gallery photo ${index + 1}`}
                aria-pressed={activeImage === index}
                className={`h-12 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-24 ${
                  activeImage === index
                    ? "border-[#FFC15A]"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <OptimizedImage
                  src={image}
                  alt=""
                  sizes="(max-width: 639px) 64px, 96px"
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
