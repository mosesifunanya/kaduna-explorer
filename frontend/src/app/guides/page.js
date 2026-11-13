import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function GuideIllustration() {
  return (
    <div
      aria-hidden="true"
      className="guide-reveal guide-illustration mx-auto mb-2 h-[54px] w-[105px] transition-transform duration-500 hover:scale-105 sm:mb-3 sm:h-[88px] sm:w-[165px]"
    >
      <svg viewBox="0 0 240 132" className="h-full w-full" fill="none">
        <path d="M12 112 67 73l29 18 38-40 82 61H12Z" fill="#DDE9D5" />
        <path
          d="m12 112 55-39 29 18 38-40 82 61"
          stroke="#6E9A70"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M26 112c22-13 37-14 57 0m40 0c20-17 43-17 70 0"
          stroke="#A7C49B"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M91 27c0-13 10-23 23-23s23 10 23 23c0 17-23 42-23 42S91 44 91 27Z"
          fill="#176B48"
          stroke="#103C2A"
          strokeWidth="3"
        />
        <circle cx="114" cy="27" r="9" fill="#F8F7F2" />
        <path
          d="M153 34c0-18 14-31 32-31s32 13 32 31v8h-64v-8Z"
          fill="#DFAF63"
          stroke="#49351D"
          strokeWidth="3"
        />
        <path
          d="M149 39h72c-4 10-16 15-36 15s-32-5-36-15Z"
          fill="#176B48"
          stroke="#103C2A"
          strokeWidth="3"
        />
        <rect
          x="158"
          y="64"
          width="61"
          height="24"
          rx="12"
          fill="#103C2A"
          stroke="#49351D"
          strokeWidth="3"
        />
        <circle
          cx="174"
          cy="76"
          r="9"
          fill="#5C8066"
          stroke="#172B45"
          strokeWidth="3"
        />
        <circle
          cx="203"
          cy="76"
          r="9"
          fill="#5C8066"
          stroke="#172B45"
          strokeWidth="3"
        />
        <path
          d="m228 16 5-8m-1 20 8-3"
          stroke="#F4B323"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function Benefit({ icon, title, description, index }) {
  return (
    <div
      style={{ animationDelay: `${0.65 + index * 0.1}s` }}
      className="guide-reveal group flex min-w-0 flex-1 flex-col items-center px-1 text-center transition-all duration-300 hover:-translate-y-1 sm:px-2"
    >
      <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[#EAF2E8] text-[#176B48] transition-all duration-300 group-hover:bg-[#103C2A] group-hover:text-white sm:mb-2 sm:h-9 sm:w-9 sm:rounded-xl">
        {icon}
      </div>

      <h3 className="text-[9px] font-extrabold leading-[1.25] text-[#18352A] min-[380px]:text-[10px] sm:text-xs">
        {title}
      </h3>

      <p className="mt-1 max-w-[125px] text-[8px] leading-[1.35] text-slate-500 min-[380px]:text-[9px] sm:text-[11px] sm:leading-[1.4]">
        {description}
      </p>
    </div>
  );
}

export default function GuidesPage() {
  return (
    <>
      <Header />

      <main className="relative isolate flex min-h-[calc(100svh-80px)] items-center justify-center overflow-hidden px-3 py-4 sm:px-6 sm:py-10 lg:py-8">
        {/* Kaduna-inspired background */}
        <div aria-hidden="true" className="absolute inset-0 -z-20">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#C9E1EF_0%,#F9D9B0_48%,#F2B96D_66%,#426B46_67%,#183F2D_100%)]" />

          <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-b from-[#5C804F] to-[#244B35]" />

          <div className="absolute -bottom-12 -left-16 h-48 w-[55%] rounded-[50%] bg-[#315E3D] sm:h-64" />

          <div className="absolute -bottom-16 -right-20 h-52 w-[65%] rounded-[50%] bg-[#244B35] sm:h-72" />

          <div className="absolute bottom-[17%] left-[7%] h-20 w-32 rotate-[-12deg] rounded-[42%] bg-[#8A765B] shadow-[inset_0_-10px_0_#6E614B] sm:h-28 sm:w-44" />

          <div className="absolute bottom-[19%] right-[8%] h-16 w-28 rotate-[9deg] rounded-[45%] bg-[#806E54] shadow-[inset_0_-8px_0_#64583F] sm:h-24 sm:w-40" />

          <div className="absolute right-[12%] top-[15%] h-16 w-16 rounded-full bg-[#FFD77B] opacity-80 blur-[2px] sm:h-24 sm:w-24" />

          <div className="absolute inset-0 bg-[#102D21]/20" />
        </div>

        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_10%,rgba(9,35,24,0.22)_100%)]" />

        {/* Coming Soon Card */}
        <section
          aria-labelledby="guides-coming-soon-title"
          className="relative w-full max-w-[680px] max-h-[75svh] overflow-y-auto rounded-[20px] border border-white/70 bg-[#FFFEFA]/95 px-3 py-3 text-center shadow-[0_20px_65px_rgba(16,60,42,0.22)] backdrop-blur-md transition-all duration-500 hover:shadow-[0_25px_75px_rgba(16,60,42,0.3)] min-[380px]:px-4 min-[380px]:py-4 sm:max-h-none sm:overflow-visible sm:rounded-[24px] sm:px-8 sm:py-7 lg:px-10 lg:py-6"
        >
          <GuideIllustration />

          {/* Page heading */}
          <h1
            id="guides-coming-soon-title"
            className="guide-reveal guide-heading mt-2 text-[21px] font-black leading-tight tracking-tight text-[#172B45] min-[380px]:text-2xl sm:mt-3 sm:text-3xl lg:text-[36px]"
          >
            Kaduna Travel Guides
          </h1>

          {/* Coming Soon badge */}
          <div className="guide-badge mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-[#FFBD4A] px-5 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#18352A] shadow-sm transition-transform duration-300 hover:scale-105 sm:mt-4 sm:px-7 sm:py-2.5 sm:text-base">
            <span className="h-2 w-2 rounded-full bg-[#103C2A]" />
            Coming Soon
          </div>

          {/* Subtitle */}
          <p className="guide-reveal guide-subtitle mx-auto mt-2 text-[11px] font-bold text-[#176B48] min-[380px]:text-xs sm:mt-3 sm:text-base">
            Your Kaduna adventure, guided.
          </p>

          <div className="mx-auto mt-2 h-[3px] w-16 rounded-full bg-[#FFBD4A] sm:h-1 sm:w-24" />

          {/* Description */}
          <p className="guide-reveal guide-description mx-auto mt-3 max-w-[540px] text-[10px] leading-[1.55] text-slate-600 min-[380px]:text-[11px] sm:mt-4 sm:text-sm sm:leading-6">
            We’re preparing a network of trusted local tour guides to help you
            discover Kaduna’s hidden gems, rich culture and remarkable
            destinations. A more personal way to experience Croc City is on the
            way.
          </p>

          {/* Feature Highlights */}
          <div className="mx-auto mt-4 grid max-w-[510px] grid-cols-3 divide-x divide-[#E4E9E0] sm:mt-5">
            <Benefit
              index={0}
              title="Verified local guides"
              description="Connect with trusted people who know Kaduna."
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3.5 19v-1.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V19" />
                  <path d="M16 5.5a3 3 0 0 1 0 5.8M17 13.5a4.5 4.5 0 0 1 3.5 4.4V19" />
                </svg>
              }
            />

            <Benefit
              index={1}
              title="Personalized tours"
              description="Explore at your own pace and interests."
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              }
            />

            <Benefit
              index={2}
              title="Authentic experiences"
              description="Discover local stories, culture and places."
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 3 2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L12 3Z" />
                </svg>
              }
            />
          </div>

          {/* Closing Message */}
          <div className="guide-reveal guide-notification mx-auto mt-4 inline-flex max-w-full items-center justify-center gap-1.5 rounded-full bg-[#103C2A] px-3 py-2 text-[9px] font-bold text-white shadow-lg shadow-[#103C2A]/20 transition-all duration-300 hover:-translate-y-1 hover:bg-[#176B48] min-[380px]:px-4 min-[380px]:text-[10px] sm:mt-6 sm:gap-2 sm:px-6 sm:py-2.5 sm:text-xs">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 shrink-0 text-[#FFBD4A] sm:h-4 sm:w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
            Something exciting is on the way!
          </div>

          {/* Explore link */}
          <div className="guide-reveal guide-explore mt-3 sm:mt-4">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 text-[9px] font-bold text-[#176B48] underline decoration-[#B8CEB5] underline-offset-4 transition-all duration-300 hover:gap-3 hover:text-[#103C2A] sm:gap-2 sm:text-xs"
            >
              Explore Kaduna destinations
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />

      {/* Entrance animations */}
      <style>{`
        @keyframes guideFadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes guideBadge {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.9);
          }

          70% {
            opacity: 1;
            transform: translateY(-1px) scale(1.02);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .guide-reveal {
          opacity: 0;
          animation: guideFadeUp 0.4s ease-out forwards;
        }

        .guide-illustration {
          animation-delay: 0s;
        }

        .guide-heading {
          animation-delay: 0.1s;
        }

        .guide-badge {
          opacity: 0;
          animation: guideBadge 0.4s ease-out 0.2s forwards;
        }

        .guide-subtitle {
          animation-delay: 0.3s;
        }

        .guide-description {
          animation-delay: 0.4s;
        }

        .guide-notification {
          animation-delay: 0.9s;
        }

        .guide-explore {
          animation-delay: 1s;
        }

        @media (prefers-reduced-motion: reduce) {
          .guide-reveal,
          .guide-badge {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </>
  );
}
