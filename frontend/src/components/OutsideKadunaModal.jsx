"use client";

import { useEffect } from "react";
import { X, ArrowRight, Compass } from "lucide-react";

export default function OutsideKadunaModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#101B20]/65 px-7 py-6 backdrop-blur-sm sm:px-6 sm:py-4"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="outside-kaduna-title"
        aria-describedby="outside-kaduna-description"
        className="relative isolate w-full max-w-[310px] overflow-hidden rounded-[21px] border border-white/70 bg-[#FFFEFA] shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:max-w-[430px]"
      >
        {/* Decorative background */}
        <div className="pointer-events-none absolute -left-16 -top-20 -z-10 h-44 w-44 rounded-full bg-[#E5F0E2]/80 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 -z-10 h-48 w-48 rounded-full bg-[#F9E9C6]/70 blur-2xl" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full text-[#758078] transition hover:bg-[#F0F3ED] sm:right-5 sm:top-5 sm:h-8 sm:w-8"
        >
          <X size={17} />
        </button>

        <div className="relative px-3.5 py-4 sm:px-8 sm:py-7">
          {/* Kaduna Explorer logo */}
          <div className="flex flex-col items-center text-center">
            <img
              src="/assets/icons/app-icon.png"
              alt="Kaduna Explorer"
              className="h-10 w-10 object-contain sm:h-[68px] sm:w-[68px]"
            />

            <p className="mt-1.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#245B3D] sm:mt-2 sm:text-[11px]">
              Kaduna Explorer
            </p>

            <p className="mt-0.5 text-[9px] font-medium text-[#8A928B] sm:text-xs">
              Explore the Heart of Kaduna
            </p>
          </div>

          {/* Main heading */}
          <div className="mt-3 text-center sm:mt-6">
            <h2
              id="outside-kaduna-title"
              className="text-[17px] font-extrabold leading-[1.2] tracking-tight text-[#1D2D38] sm:text-[30px]"
            >
              Kaduna Can't Wait to{" "}
              <span className="text-[#D99A32]">Welcome</span> You!{" "}
              <span>💚😞</span>
            </h2>

            <p
              id="outside-kaduna-description"
              className="mx-auto mt-1.5 max-w-[260px] text-[10px] leading-[16px] text-[#71808A] sm:mt-3 sm:max-w-[360px] sm:text-base sm:leading-7"
            >
              You're outside Kaduna State, but your Adventure can start before
              you arrive!
            </p>
          </div>

          {/* Information panel */}
          <div className="mt-2.5 flex items-start gap-2 rounded-[14px] border border-[#DCE9DC] bg-[#F1F6EF] px-2.5 py-2 sm:mt-6 sm:gap-4 sm:rounded-[22px] sm:px-4 sm:py-4">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DFEDE0] text-[#195C40] sm:h-12 sm:w-12">
              <Compass size={15} className="sm:hidden" />
              <Compass size={25} className="hidden sm:block" />
            </div>

            <p className="pt-0.5 text-[9px] leading-[15px] text-[#40584D] sm:text-sm sm:leading-6">
              Explore places around your selected Kaduna destination. GPS
              discovery around your current location is available within Kaduna
              State.
            </p>
          </div>

          {/* Continue button */}
          <button
            type="button"
            onClick={onClose}
            className="group mt-3 flex min-h-9 w-full items-center justify-center gap-2 rounded-[11px] bg-[#075239] px-3 py-2 text-[11px] font-bold text-white shadow-[0_5px_14px_rgba(7,82,57,0.16)] transition duration-300 hover:bg-[#0B6848] focus:outline-none focus:ring-4 focus:ring-[#075239]/20 sm:mt-6 sm:min-h-[54px] sm:rounded-[17px] sm:text-base"
          >
            Continue exploring
            <ArrowRight
              size={15}
              className="transition-transform group-hover:translate-x-1 sm:h-[17px] sm:w-[17px]"
            />
          </button>

          {/* Footer */}
          <p className="mt-1.5 text-center text-[8px] font-medium text-[#89938E] sm:mt-4 sm:text-xs">
            Discover the beauty of Kaduna State 💚
          </p>
        </div>
      </section>
    </div>
  );
}
