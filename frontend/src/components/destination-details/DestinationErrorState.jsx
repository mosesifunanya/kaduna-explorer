import Link from "next/link";
import { ArrowLeft, Compass, RefreshCw } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function DestinationErrorState({ error, onRetry }) {
  return (
    <main className="min-h-screen bg-[#FAF9F6]">
      <Header activeNav="explore" />

      <section className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-16">
        <div className="w-full rounded-3xl border border-[#EAE7DF] bg-white p-8 text-center sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5F2EA] text-[#A96816]">
            <Compass size={28} />
          </div>

          <h1 className="mt-5 text-2xl font-extrabold text-[#192A35]">
            {error
              ? "Unable to load this destination"
              : "Destination not found"}
          </h1>

          <p className="mt-3 text-sm leading-7 text-[#707B82]">
            {error ||
              "This place may have been removed, unpublished, or the link may have changed."}
          </p>

          {error && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#192A35] px-5 py-3 text-sm font-bold text-white hover:bg-[#344854]"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          )}

          <div>
            <Link
              href="/explore"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#E4E3DD] px-5 py-3 text-sm font-bold text-[#263A46] transition hover:bg-[#F7F6F1]"
            >
              <ArrowLeft size={16} />
              Back to Explore
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
