"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  ArrowUpRight,
  Compass,
  Globe2,
  Heart,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Sparkles,
} from "lucide-react";

import { navigationLinks } from "@/lib/homeData";

import { apiRequest } from "@/lib/api";

const CONTACT = {
  phone: "+234 813 492 3314",

  email: "mosesifunanya@gmail.com",

  address: "Kaduna, Kaduna State, Nigeria",
};

const JOURNEY_LINKS = [
  { label: "Saved places", href: "/dashboard/saved" },

  { label: "Plan your trip", href: "/dashboard/trips" },

  { label: "Sign in", href: "/login" },

  { label: "Create an account", href: "/signup" },
];

const linkClass =
  "group inline-flex w-fit items-center gap-1.5 text-[13px] font-bold leading-tight text-white transition-all duration-300 hover:translate-x-1 hover:text-[#FFB800]";

function SectionHeading({ icon: Icon, children }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#FFB800] text-[#FFB800] transition-transform duration-300 hover:scale-105 sm:h-10 sm:w-10">
        <Icon
          size={16}
          strokeWidth={2.4}
          className="sm:h-[19px] sm:w-[19px]"
          aria-hidden="true"
        />
      </span>

      <h2 className="!m-0 !text-[13px] !font-extrabold !uppercase !leading-tight !tracking-[0.09em] !text-white">
        {children}
      </h2>
    </div>
  );
}

function ContactRow({ icon: Icon, children, href }) {
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#FFB800]/20 bg-[#234C5C] text-[#FFB800] transition-colors duration-300 group-hover:border-[#FFB800]/70 sm:h-9 sm:w-9">
        <Icon
          size={16}
          strokeWidth={2.4}
          className="sm:h-[18px] sm:w-[18px]"
          aria-hidden="true"
        />
      </span>

      <span className="min-w-0 text-[13px] font-bold leading-[1.35] text-white transition-colors group-hover:text-[#FFB800]">
        {children}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="group flex min-w-0 items-center gap-2 rounded-xl py-0"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="group flex min-w-0 items-center gap-2 py-0">{content}</div>
  );
}

export default function Footer() {
  const [year, setYear] = useState(2026);

  const [email, setEmail] = useState("");

  const [newsletterMessage, setNewsletterMessage] = useState("");

  const [newsletterStatus, setNewsletterStatus] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const footerLinks = navigationLinks.filter(({ key }) =>
    ["explore", "events", "guides", "about"].includes(key),
  );

  async function handleNewsletterSubmit(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || isSubmitting) return;

    setIsSubmitting(true);

    setNewsletterMessage("");

    setNewsletterStatus("");

    try {
      const response = await apiRequest("newsletter/subscribe", {
        method: "POST",

        body: { email: normalizedEmail },
      });

      setNewsletterStatus("success");

      setNewsletterMessage(
        response.message || "Thank you for subscribing to Kaduna Explorer!",
      );

      setEmail("");
    } catch (error) {
      setNewsletterStatus("error");

      setNewsletterMessage(
        error.message || "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <footer
      id="kaduna-shared-footer"
      className="relative w-full overflow-hidden border-t border-white/15 !bg-[#2F5B71] !text-white"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
        {/*  Main footer grid  */}

        <div className="grid grid-cols-2 gap-x-4 gap-y-6 py-7 sm:grid-cols-2 sm:gap-x-7 sm:gap-y-7 sm:py-10 lg:grid-cols-3 xl:grid-cols-[1.3fr_0.85fr_1.05fr_0.85fr_1.2fr] xl:gap-x-6 xl:py-11">
          {/*  Brand  */}

          <div className="col-span-2 order-1 min-w-0 sm:col-span-1 sm:order-none xl:border-r xl:border-white/35 xl:pr-6">
            <Link
              href="/"
              aria-label="Kaduna Explorer homepage"
              className="group inline-flex"
            >
              <img
                src="/assets/brand/logo-horizontal.png"
                alt="Kaduna Explorer"
                width={320}
                height={100}
                className="-translate-y-4 h-[75px] w-[220px] object-contain transition-transform duration-300 group-hover:scale-[1.025] sm:h-[100px] sm:w-[280px]"
              />
            </Link>

            <p className="-mt-7 max-w-[340px] border-l-[3px] border-[#FFB800] pl-4 font-serif text-[14px] italic font-medium leading-[1.6] text-white">
              Discover the extraordinary side of Kaduna. From breathtaking
              landscapes and cultural heritage to hidden gems and unforgettable
              local experiences, your next adventure starts here.
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {["DISCOVER", "EXPLORE", "EXPERIENCE"].map((word, index) => {
                const isYellow = index !== 1;

                return (
                  <span
                    key={word}
                    className={`rounded-full border px-3 py-1.5 text-[9px] font-extrabold tracking-[0.08em] transition-transform duration-300 hover:-translate-y-0.5 ${
                      isYellow
                        ? "border-[#FFB800] bg-[#FFB800] text-[#173B45]"
                        : "border-white/60 bg-transparent text-white"
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </div>

            <p className="mt-4 whitespace-nowrap font-serif text-[10px] font-bold italic uppercase leading-[1.4] tracking-[0.02em] text-[#FFB800]">
              <span className="mr-1">━</span>
              Your Kaduna. Your next adventure.
            </p>
          </div>

          {/*  Discover Kaduna  */}

          <div className="order-2 min-w-0 border-r border-white/25 pr-3 sm:order-none sm:border-r-0 sm:pr-0">
            <SectionHeading icon={Compass}>Discover Kaduna</SectionHeading>

            <p className="mb-3 max-w-[240px] font-serif text-[13px] italic font-medium leading-[1.5] text-white">
              Find the places, stories and experiences worth discovering.
            </p>

            <nav
              aria-label="Footer discovery navigation"
              className="flex flex-col items-start gap-2.5"
            >
              {footerLinks.map(({ key, label, href }) => (
                <Link key={key} href={href} className={linkClass}>
                  {label}

                  <ArrowUpRight
                    size={15}
                    strokeWidth={2.8}
                    className="text-[#FFB800] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              ))}

              <Link href="/explore" className={linkClass}>
                All destinations
                <ArrowUpRight
                  size={15}
                  strokeWidth={2.8}
                  className="text-[#FFB800]"
                  aria-hidden="true"
                />
              </Link>
            </nav>
          </div>

          {/*  Get in Touch  */}

          <div
            id="footer-contact"
            className="col-span-2 order-4 min-w-0 scroll-mt-24 border-t border-white/25 pt-5 sm:col-span-1 sm:order-none sm:border-t-0 sm:pt-0 lg:col-span-1"
          >
            <SectionHeading icon={Mail}>Get in Touch</SectionHeading>

            <p className="mb-3 max-w-[260px] font-serif text-[13px] italic font-medium leading-[1.5] text-white">
              Have a question or need assistance? We'd love to hear from you.
            </p>

            <div className="flex flex-col gap-1">
              <ContactRow
                icon={Phone}
                href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`}
              >
                {CONTACT.phone}
              </ContactRow>

              <ContactRow icon={Mail} href={`mailto:${CONTACT.email}`}>
                {CONTACT.email}
              </ContactRow>

              <ContactRow icon={MapPin}>{CONTACT.address}</ContactRow>
            </div>
          </div>

          {/*  Your Journey  */}

          <div className="order-3 min-w-0 pl-1 sm:order-none sm:pl-0">
            <SectionHeading icon={Navigation}>Your Journey</SectionHeading>

            <p className="mb-3 max-w-[240px] font-serif text-[13px] italic font-medium leading-[1.5] text-white">
              Make every moment count. Your Kaduna experience begins here.
            </p>

            <nav
              aria-label="Visitor navigation"
              className="flex flex-col items-start gap-2.5"
            >
              {JOURNEY_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className={linkClass}>
                  {item.label}

                  <ArrowUpRight
                    size={15}
                    strokeWidth={2.8}
                    className="text-[#FFB800] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </nav>
          </div>

          {/*  Stay in the Loop  */}

          <div className="col-span-2 order-5 min-w-0 border-t border-white/25 pt-5 sm:col-span-1 sm:order-none sm:border-t-0 sm:pt-0 lg:col-span-1">
            <SectionHeading icon={Sparkles}>Stay in the Loop</SectionHeading>

            <p className="mb-3 max-w-[300px] font-serif text-[13px] italic font-medium leading-[1.5] text-white">
              Get the latest destinations, travel tips and exclusive updates
              directly to your inbox.
            </p>

            <form onSubmit={handleNewsletterSubmit} className="w-full">
              <div className="flex min-h-[48px] w-full overflow-hidden rounded-full border border-white/30 bg-white shadow-lg transition-all duration-300 focus-within:border-[#FFB800] focus-within:ring-2 focus-within:ring-[#FFB800]/30">
                <label htmlFor="footer-newsletter-email" className="sr-only">
                  Email address
                </label>

                <div className="flex min-w-0 flex-1 items-center gap-2 px-3.5">
                  <Mail
                    size={19}
                    className="shrink-0 text-[#174B59]"
                    aria-hidden="true"
                  />

                  <input
                    id="footer-newsletter-email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    value={email}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setEmail(event.target.value);

                      setNewsletterMessage("");

                      setNewsletterStatus("");
                    }}
                    placeholder="Enter your email"
                    className="min-w-0 w-full bg-transparent py-2.5 text-[13px] font-medium leading-normal text-[#173B45] outline-none placeholder:text-[#71858A] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="shrink-0 bg-[#FFB800] px-4 text-[12px] font-extrabold leading-normal text-[#173B45] transition-colors duration-300 hover:bg-[#FFD04B] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Subscribing..." : "Subscribe"}
                </button>
              </div>

              {newsletterMessage && (
                <p
                  role="status"
                  aria-live="polite"
                  className={`mt-2 text-[12px] font-semibold leading-[1.4] ${
                    newsletterStatus === "success"
                      ? "text-[#FFDC73]"
                      : "text-white"
                  }`}
                >
                  {newsletterMessage}
                </p>
              )}
            </form>

            <p className="mt-2.5 text-center font-serif text-[12px] italic font-medium leading-[1.5] text-white sm:text-left">
              Discover more of Kaduna. No unnecessary emails.
            </p>
          </div>
        </div>

        {/*  Bottom bar  */}

        <div className="border-t border-white/40 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] font-semibold leading-normal text-white">
              © {year} Kaduna Explorer. All rights reserved.
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="inline-flex items-center gap-2 text-[12px] font-semibold leading-normal text-white">
                <Globe2
                  size={17}
                  strokeWidth={2.5}
                  className="text-[#FFB800]"
                  aria-hidden="true"
                />
                Kaduna State, Nigeria
              </span>

              <span className="hidden h-2 w-2 rounded-full bg-[#FFB800] sm:block" />

              <span className="inline-flex items-center gap-2 text-[12px] font-semibold leading-normal text-white">
                Made for explorers
                <Heart
                  size={16}
                  className="fill-[#FFB800] text-[#FFB800]"
                  aria-hidden="true"
                />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/*  Bottom accent  */}

      <div className="h-[5px] w-full bg-gradient-to-r from-[#2F5B71] via-[#FFB800] to-[#2F5B71]" />
    </footer>
  );
}
