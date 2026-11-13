"use client";

import {
  ArrowRight,
  Compass,
  Landmark,
  LocateFixed,
  MapPin,
  Mountain,
  RefreshCw,
  Search,
  Utensils,
  X,
} from "lucide-react";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=2200&q=90";

export default function ExploreHero({
  search,
  setSearch,
  handleSearchSubmit,
  clearSearch,
  externalLoading,
  nearbyOpen,
  toggleNearby,
}) {
  return (
    <section className="px-3 pb-5 pt-4 font-[family-name:var(--font-inter)] sm:px-6 sm:pt-5 lg:px-8">
      <div className="group relative mx-auto flex min-h-[300px] max-w-[1440px] items-center overflow-hidden rounded-[22px] bg-[#192A35] bg-cover bg-center sm:min-h-[320px] lg:min-h-[335px]">
        {/* Hero background with subtle hover movement */}
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-100 bg-cover bg-center transition-transform duration-[1200ms] ease-out group-hover:scale-[1.025] motion-reduce:transition-none"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(15,28,39,.94) 0%, rgba(15,28,39,.80) 43%, rgba(15,28,39,.12) 100%), url("${HERO_IMAGE}")`,
          }}
        />

        <div className="relative z-10 w-full px-5 py-8 sm:px-9 sm:py-9 lg:px-12">
          <div className="w-full max-w-4xl">
            {/* Eyebrow */}
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.19em] text-[#F4B400] transition-all duration-500 group-hover:translate-x-1 sm:text-xs">
              <Compass size={15} strokeWidth={2.2} />
              Discover Kaduna
            </p>

            {/* Hero heading */}
            <h1 className="mt-4 w-full font-[family-name:var(--font-playfair)] text-[36px] font-bold leading-[1.08] tracking-[-0.035em] text-white transition-all duration-700 ease-out group-hover:translate-y-[-2px] sm:text-5xl lg:max-w-none lg:whitespace-nowrap lg:text-[56px] xl:text-[64px]">
              Find your next{" "}
              <span className="inline-block italic text-[#F4B400] transition-transform duration-500 ease-out group-hover:scale-[1.035]">
                adventure.
              </span>
            </h1>

            {/* Supporting description */}
            <p className="mt-4 max-w-none text-[13px] font-normal leading-[1.7] text-white/85 transition-colors duration-500 group-hover:text-white sm:mt-5 sm:text-base sm:leading-7 lg:whitespace-nowrap">
              Remarkable places, local flavours and cultural experiences across
              Kaduna State.
            </p>

            {/* Main destination search */}
            <form
              className="mt-6 flex max-w-2xl flex-col gap-2 sm:flex-row"
              onSubmit={handleSearchSubmit}
            >
              <label className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl bg-white px-4 text-[#263A46] shadow-lg transition-all duration-300 focus-within:-translate-y-0.5 focus-within:shadow-[0_8px_24px_rgba(0,0,0,0.2)] focus-within:ring-2 focus-within:ring-[#F4B400]">
                <Search
                  size={19}
                  strokeWidth={2}
                  className="h-[19px] w-[19px] shrink-0 text-[#73818B] transition-transform duration-300 group-focus-within:scale-110"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search destinations, hotels, restaurants..."
                  aria-label="Search destinations and nearby places"
                  className="min-w-0 flex-1 bg-transparent py-3 text-[13px] font-normal outline-none placeholder:text-[#929BA2] sm:text-sm"
                />

                {search && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Clear search"
                    className="shrink-0 rounded-full p-1.5 text-[#73818B] transition-all duration-200 hover:rotate-90 hover:bg-[#F0F0EC] hover:text-[#192A35] active:scale-90"
                  >
                    <X size={15} />
                  </button>
                )}
              </label>

              {/* Search button */}
              <button
                type="submit"
                disabled={externalLoading}
                className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#F4B400] px-5 text-[13px] font-bold text-[#192A35] shadow-[0_4px_14px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#FFCA35] hover:shadow-[0_8px_20px_rgba(244,180,0,0.25)] active:translate-y-0 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4B400] disabled:cursor-wait disabled:opacity-70 sm:h-12 sm:w-auto sm:px-6 sm:text-sm"
              >
                {externalLoading ? "Searching..." : "Search"}

                {externalLoading ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                )}
              </button>
            </form>

            {/* Nearby Search toggle */}
            <div className="mt-4">
              <button
                type="button"
                role="switch"
                aria-checked={nearbyOpen}
                aria-label="Nearby Search"
                aria-controls="nearby-search-panel"
                onClick={toggleNearby}
                className="group/nearby inline-flex items-center gap-2 rounded-full border border-[#DCE9DF] bg-white px-2.5 py-1.5 shadow-[0_3px_12px_rgba(0,0,0,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_7px_18px_rgba(0,0,0,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F4B400] active:scale-[0.97] motion-reduce:transition-none sm:gap-2.5 sm:px-3 sm:py-2"
              >
                <LocateFixed
                  size={14}
                  strokeWidth={2.4}
                  className="h-[14px] w-[14px] shrink-0 text-[#075239] transition-transform duration-300 group-hover/nearby:rotate-12 group-hover/nearby:scale-110 sm:h-4 sm:w-4"
                  aria-hidden="true"
                />

                <span className="whitespace-nowrap text-[11px] font-bold tracking-tight text-[#075239] sm:text-xs">
                  Nearby
                </span>

                {/* Sliding switch */}
                <span
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-[2px] shadow-inner transition-colors duration-300 ease-in-out motion-reduce:transition-none sm:h-[22px] sm:w-10 ${
                    nearbyOpen ? "bg-[#075239]" : "bg-[#AAB7AE]"
                  }`}
                >
                  <span
                    className={`block h-4 w-4 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none sm:h-[18px] sm:w-[18px] ${
                      nearbyOpen
                        ? "translate-x-4 sm:translate-x-[18px]"
                        : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            </div>

            {/* Explore highlights */}
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-[family-name:var(--font-inter)] text-[11px] font-medium text-white/90 sm:text-xs">
              <span className="inline-flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#F4B400]">
                <MapPin
                  size={15}
                  className="shrink-0 text-[#F4B400] transition-transform duration-300 hover:scale-125"
                />
                Top destinations
              </span>

              <span className="inline-flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#F4B400]">
                <Utensils size={15} className="shrink-0 text-[#F4B400]" />
                Local food
              </span>

              <span className="inline-flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#F4B400]">
                <Mountain size={15} className="shrink-0 text-[#F4B400]" />
                Natural beauty
              </span>

              <span className="inline-flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#F4B400]">
                <Landmark size={15} className="shrink-0 text-[#F4B400]" />
                Cultural experiences
              </span>
            </div>
          </div>
        </div>

        {/* Kaduna location label */}
        <div className="absolute bottom-4 right-5 hidden items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-2 font-[family-name:var(--font-inter)] text-xs font-medium text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#F4B400]/60 hover:bg-black/40 lg:inline-flex">
          <MapPin size={14} className="text-[#F4B400]" />
          Discover Kaduna State
        </div>
      </div>
    </section>
  );
}
