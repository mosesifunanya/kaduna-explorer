import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function DestinationLoading() {
  return (
    <main className="min-h-screen bg-[#FAF9F6]">
      <Header activeNav="explore" />

      <div className="mx-auto max-w-[1280px] animate-pulse px-4 py-8 sm:px-6">
        <div className="h-4 w-44 rounded bg-[#E7E4DB]" />
        <div className="mt-6 h-[280px] rounded-3xl bg-[#E7E4DB] sm:h-[430px]" />
        <div className="mt-7 h-9 w-2/3 rounded bg-[#E7E4DB]" />
        <div className="mt-4 h-4 w-full max-w-2xl rounded bg-[#E7E4DB]" />

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="h-24 rounded-2xl bg-[#E7E4DB]" />
          <div className="h-24 rounded-2xl bg-[#E7E4DB]" />
          <div className="h-24 rounded-2xl bg-[#E7E4DB]" />
        </div>
      </div>

      <Footer />
    </main>
  );
}
