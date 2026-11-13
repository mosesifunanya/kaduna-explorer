export default function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
}) {
  return (
    <div className="w-full">
      {eyebrow && (
        <p
          className={`text-xs font-extrabold uppercase tracking-[0.18em] ${
            light ? "text-[#FFBD4A]" : "text-[#087747]"
          }`}
        >
          {eyebrow}
        </p>
      )}

      {title && (
        <h2
          className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${
            light ? "text-white" : "text-[#123B79]"
          }`}
        >
          {title}
        </h2>
      )}

      {description && (
        <p
          className={`mt-3 max-w-2xl text-sm leading-7 ${
            light ? "text-white/80" : "text-[#526B8A]"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
