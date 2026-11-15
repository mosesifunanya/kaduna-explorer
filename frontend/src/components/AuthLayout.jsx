import Link from "next/link";
import { MapPin, Compass, CalendarDays } from "lucide-react";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import Header from "@/components/Header";
import OptimizedImage from "@/components/OptimizedImage";

const crocFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["italic"],
  display: "swap",
});

const modernFont = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export default function AuthLayout({ title, description, children, footer }) {
  const highlights = [
    { icon: MapPin, text: "Explore Destinations" },
    { icon: Compass, text: "Find Nearby Places" },
    { icon: CalendarDays, text: "Plan Your Trip" },
  ];

  const isSignup = title === "Create your account";

  return (
    <>
      <Header />

      <main
        className={`${modernFont.className} relative isolate flex h-[calc(100dvh-86px)] min-h-0 w-full items-center justify-center overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[#09251D] px-2 pt-3 pb-[90px] sm:px-6 sm:py-4 lg:h-auto lg:min-h-[calc(100dvh-86px)] lg:items-center lg:overflow-y-visible lg:px-8 lg:py-3`}
      >
        {/* Optimized Kaduna background image */}
        <div aria-hidden="true" className="fixed inset-0 -z-30">
          <OptimizedImage
            src="/assets/images/backgrounds/kaduna-hero.png"
            alt=""
            fill
            sizes="100vw"
            priority
            quality={75}
            className="object-cover object-center"
          />
        </div>

        {/* Cinematic background overlay */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-20 bg-[#071E19]/20"
        />

        {/* Background contrast */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 bg-gradient-to-r from-[#061D18]/35 via-transparent to-[#061D18]/20"
        />

        {/* Main responsive composition */}
        <div className="relative z-10 mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-14">
          {/* LEFT: Kaduna introduction */}
          <section className="hidden max-w-[560px] text-white lg:block lg:translate-x-4 xl:translate-x-35">
            <div>
              <h2 className="leading-[0.96]">
                <span
                  className={`${crocFont.className} block text-[50px] font-semibold italic tracking-[-0.035em] xl:text-[56px]`}
                >
                  Croc City
                </span>

                <span className="mt-1 block text-[42px] font-extrabold italic leading-[1.05] tracking-[-0.065em] xl:text-[47px]">
                  Awaits You
                </span>
              </h2>

              <div className="relative ml-1 mt-4 h-[4px] w-[125px] -rotate-[3deg] rounded-full bg-gradient-to-r from-[#16A34A] via-[#8BCB38] to-[#F4B400]" />
            </div>

            <p className="mt-5 max-w-[460px] text-[14px] font-medium leading-[1.8] tracking-[-0.015em] text-white/95 xl:text-[15px]">
              Discover the beauty, culture, and
              <br className="hidden xl:block" />
              unforgettable experiences of Kaduna State.
            </p>

            <div className="mt-7 space-y-4">
              {highlights.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3.5">
                  <Icon
                    size={24}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="shrink-0 text-[#F4D51E]"
                  />

                  <span className="text-[14px] font-medium tracking-[0.005em] text-white xl:text-[15px]">
                    {text}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-9 text-[8px] font-bold tracking-[0.23em] text-white/80">
              DISCOVER
              <span className="mx-2 text-[#F4B400]">•</span>
              EXPLORE
              <span className="mx-2 text-[#F4B400]">•</span>
              EXPERIENCE
            </p>
          </section>

          {/* RIGHT: Authentication card */}
          <section
            className={`relative mx-auto w-full min-w-0 ${
              isSignup
                ? "max-w-[330px] sm:max-w-[390px] lg:max-w-[390px] xl:max-w-[410px]"
                : "max-w-[320px] sm:max-w-[370px] lg:max-w-[360px] xl:max-w-[380px]"
            } top-0 lg:top-0 lg:-translate-x-50`}
          >
            <div className="relative isolate w-full min-w-0 overflow-hidden rounded-[17px] border border-white/80 bg-[#FFFDF8]/95 shadow-[0_20px_65px_rgba(0,0,0,0.27)] backdrop-blur-xl sm:rounded-[22px]">
              {/* Card content */}
              <div
                className={`relative z-10 min-w-0 ${
                  isSignup
                    ? "px-2.5 py-1 sm:px-4 sm:py-2.5 lg:px-4 lg:py-2"
                    : "px-3 py-1.5 sm:px-5 sm:py-4 lg:px-4 lg:py-3"
                }`}
              >
                {/* Official Kaduna Explorer logo */}
                <Link
                  href="/"
                  aria-label="Kaduna Explorer home"
                  className={`mx-auto flex w-fit justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400] focus-visible:ring-offset-4 ${
                    isSignup ? "mb-1" : "mb-1.5"
                  }`}
                >
                  <img
                    src="/assets/brand/logo-vertical.png"
                    alt="Kaduna Explorer"
                    className={`w-auto object-contain ${
                      isSignup
                        ? "max-w-[64px] h-[38px] sm:max-w-[68px] sm:h-[52px] lg:h-[50px]"
                        : "max-w-[70px] h-[48px] sm:h-[66px] lg:h-[62px]"
                    }`}
                  />
                </Link>

                {/* Authentication heading */}
                <div className="text-center">
                  {title && (
                    <h1
                      className={`font-extrabold leading-tight tracking-[-0.035em] text-[#103C2A] ${
                        isSignup
                          ? "text-[17px] sm:text-[20px] lg:text-[19px]"
                          : "text-[19px] sm:text-[22px] lg:text-[21px]"
                      }`}
                    >
                      {title}
                    </h1>
                  )}

                  {description && (
                    <p
                      className={`mx-auto font-medium leading-[1.4] text-[#536B87] ${
                        isSignup
                          ? "mt-0 max-w-[270px] text-[8px] sm:mt-0.5 sm:text-[10px]"
                          : "mt-1 max-w-[260px] text-[10px] sm:text-[12px]"
                      }`}
                    >
                      {description}
                    </p>
                  )}
                </div>

                {/* Login or signup form */}
                <div
                  className={`relative z-10 w-full min-w-0 overflow-hidden ${
                    isSignup
                      ? "mt-1.5 sm:mt-2.5 lg:mt-2"
                      : "mt-2.5 sm:mt-4 lg:mt-3"
                  } [&_*]:max-w-full`}
                >
                  {children}
                </div>

                {/* Account switching */}
                {footer && (
                  <div
                    className={`relative z-10 border-t border-[#E8EDE8] text-center text-[15px] leading-5 text-[#63758A] sm:text-[12px] ${
                      isSignup
                        ? "mt-1.5 pt-1 sm:mt-2.5 sm:pt-2"
                        : "mt-2 pt-1.5 sm:mt-3 sm:pt-2.5"
                    }`}
                  >
                    {footer}
                  </div>
                )}
              </div>

              {/* Card footer */}
              <div className="relative z-10 border-t border-[#E7EAE2] bg-[#F8F7F0]/90 px-2 py-1 text-center">
                <p className="text-[6px] font-bold tracking-[0.13em] text-[#536B65] sm:text-[8px]">
                  DISCOVER
                  <span className="mx-1.5 text-[#E8A91D]">•</span>
                  EXPLORE
                  <span className="mx-1.5 text-[#E8A91D]">•</span>
                  EXPERIENCE
                </p>
              </div>
            </div>

            {/* Mobile description */}
            <p className="mt-1.5 text-center text-[8px] font-medium leading-4 text-white/90 lg:hidden">
              Discover the beauty, culture, and experiences of Kaduna State.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
