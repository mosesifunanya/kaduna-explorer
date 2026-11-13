"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  ImagePlus,
  Upload,
  X,
  Plus,
  Trash2,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Ticket,
  Building2,
  Globe,
  Clock3,
  Navigation,
  FileText,
  Sparkles,
  Eye,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as Link2,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EVENT_CATEGORIES = [
  { value: "music", label: "Music & Concerts" },
  { value: "culture", label: "Culture & Heritage" },
  { value: "festival", label: "Festivals" },
  { value: "food", label: "Food & Drinks" },
  { value: "sports", label: "Sports" },
  { value: "business", label: "Business & Networking" },
  { value: "education", label: "Education & Workshops" },
  { value: "arts", label: "Arts & Entertainment" },
  { value: "religious", label: "Religious Events" },
  { value: "community", label: "Community Events" },
  { value: "other", label: "Other" },
];

const INITIAL_FORM = {
  title: "",
  slug: "",
  category: "music",
  categoryLabel: "",
  description: "",
  shortDescription: "",
  highlights: [""],

  venue: "",
  address: "",
  city: "Kaduna",
  lga: "",
  state: "Kaduna",

  latitude: "",
  longitude: "",

  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",

  organiser: "",
  organiserDescription: "",
  organiserWebsite: "",
  organiserEmail: "",
  organiserPhone: "",

  ticketUrl: "",
  registrationUrl: "",
  ticketInformation: "",

  isPublished: false,
  isFeatured: false,
};

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateImage(file) {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return `${file.name} is not supported. Choose JPG, PNG or WebP.`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `${file.name} exceeds the 5 MB file-size limit.`;
  }

  return "";
}

function validateUrl(value, label) {
  if (!value.trim()) return "";

  try {
    const parsed = new URL(value.trim());

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return `${label} must use HTTP or HTTPS.`;
    }
  } catch {
    return `Enter a valid ${label.toLowerCase()}.`;
  }

  return "";
}

function getPlainText(html) {
  if (typeof document === "undefined") {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .trim();
  }

  const container = document.createElement("div");
  container.innerHTML = html || "";

  return (container.textContent || "").replace(/\u00a0/g, " ").trim();
}

function toLagosIso(date, time, isEnd = false) {
  if (!date) return "";

  const clock = time || (isEnd ? "23:59:59" : "00:00:00");
  const normalizedClock = clock.length === 5 ? `${clock}:00` : clock;

  // Africa/Lagos uses UTC+01:00.
  // Explicit offset prevents the browser's local timezone from changing the event time.
  return new Date(`${date}T${normalizedClock}+01:00`).toISOString();
}

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF5EA] text-[#176B48]">
        <Icon size={19} />
      </div>

      <div>
        <h2 className="text-sm font-extrabold text-[#103C2A] sm:text-base">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 flex items-center gap-1 text-xs font-bold text-[#294638]">
        {label}

        {required && <span className="text-red-500">*</span>}
      </span>

      {children}

      {hint && (
        <span className="mt-1.5 block text-[10px] leading-5 text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
}

const inputClass =
  "w-full min-w-0 rounded-xl border border-[#DFE7DD] bg-white px-3.5 py-3 text-xs text-[#18352A] outline-none transition placeholder:text-slate-400 hover:border-[#B9CCB8] focus:border-[#176B48] focus:ring-4 focus:ring-[#176B48]/10 sm:text-sm";

const textareaClass =
  "w-full min-w-0 resize-y rounded-xl border border-[#DFE7DD] bg-white px-3.5 py-3 text-xs leading-6 text-[#18352A] outline-none transition placeholder:text-slate-400 hover:border-[#B9CCB8] focus:border-[#176B48] focus:ring-4 focus:ring-[#176B48]/10 sm:text-sm";

function ImagePreview({ file, url, onRemove, label }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[#DFE7DD] bg-[#F7F9F7]">
      <img
        src={url}
        alt={file?.name || label}
        className="h-36 w-full object-cover sm:h-40"
      />

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent p-3 pt-8">
        <span className="min-w-0 truncate text-[10px] font-semibold text-white">
          {file?.name || label}
        </span>

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/90 text-red-600 transition hover:bg-red-600 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function RichTextEditor({ value, onChange, editorRef, className }) {
  useEffect(() => {
    const editor = editorRef.current;

    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = value || "";
    }
  }, [value, editorRef]);

  function runCommand(command, commandValue = null) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || "");
  }

  function insertLink() {
    const url = window.prompt("Enter the link URL (https://...):");

    if (!url) return;

    try {
      const parsed = new URL(url);

      if (["http:", "https:"].includes(parsed.protocol)) {
        runCommand("createLink", parsed.href);
      }
    } catch {
      // Invalid links are ignored.
    }
  }

  const buttons = [
    { icon: Bold, command: "bold", label: "Bold" },
    { icon: Italic, command: "italic", label: "Italic" },
    { icon: UnderlineIcon, command: "underline", label: "Underline" },
    { icon: Heading1, command: "formatBlock", value: "H2", label: "Heading" },
    {
      icon: Heading2,
      command: "formatBlock",
      value: "H3",
      label: "Subheading",
    },
    { icon: List, command: "insertUnorderedList", label: "Bullet list" },
    { icon: ListOrdered, command: "insertOrderedList", label: "Numbered list" },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[#DFE7DD] bg-white transition focus-within:border-[#176B48] focus-within:ring-4 focus-within:ring-[#176B48]/10">
      <div className="flex flex-wrap items-center gap-1 border-b border-[#E7EDE5] bg-[#F9FBF7] p-2">
        {buttons.map(({ icon: Icon, command, value: commandValue, label }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => runCommand(command, commandValue || null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#53715C] transition hover:bg-[#EAF2E6] hover:text-[#103C2A]"
          >
            <Icon size={15} />
          </button>
        ))}

        <button
          type="button"
          title="Insert link"
          aria-label="Insert link"
          onClick={insertLink}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#53715C] transition hover:bg-[#EAF2E6] hover:text-[#103C2A]"
        >
          <Link2 size={15} />
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        data-placeholder="Write a detailed description of the event..."
        className={`${className} min-h-[220px] border-0 focus:ring-0 [&:empty]:before:pointer-events-none [&:empty]:before:text-slate-400 [&:empty]:before:content-[attr(data-placeholder)]`}
      />
    </div>
  );
}

export default function NewEventPage() {
  const router = useRouter();

  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const descriptionEditorRef = useRef(null);

  const [form, setForm] = useState(INITIAL_FORM);

  const [coverFile, setCoverFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);

  const [coverPreview, setCoverPreview] = useState("");
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  const [imageError, setImageError] = useState("");
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview("");
      return undefined;
    }

    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  useEffect(() => {
    const previews = galleryFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setGalleryPreviews(previews);

    return () => {
      previews.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [galleryFiles]);

  function updateField(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "title" && !slugEdited ? { slug: slugify(value) } : {}),
    }));

    setPageError("");
    setSuccessMessage("");
  }

  function handleSlugChange(event) {
    setSlugEdited(true);

    setForm((previous) => ({
      ...previous,
      slug: slugify(event.target.value),
    }));
  }

  function handleCoverChange(event) {
    const file = event.target.files?.[0];

    event.target.value = "";
    setImageError("");

    if (!file) return;

    const validationError = validateImage(file);

    if (validationError) {
      setImageError(validationError);
      return;
    }

    setCoverFile(file);
  }

  function handleGalleryChange(event) {
    const files = Array.from(event.target.files || []);

    event.target.value = "";
    setImageError("");

    const validFiles = [];

    for (const file of files) {
      const validationError = validateImage(file);

      if (validationError) {
        setImageError(validationError);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length) {
      setGalleryFiles((previous) => [...previous, ...validFiles]);
    }
  }

  function removeGalleryImage(index) {
    setGalleryFiles((previous) =>
      previous.filter((_, fileIndex) => fileIndex !== index),
    );
  }

  function addHighlight() {
    setForm((previous) => ({
      ...previous,
      highlights: [...previous.highlights, ""],
    }));
  }

  function updateHighlight(index, value) {
    setForm((previous) => ({
      ...previous,
      highlights: previous.highlights.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    }));
  }

  function removeHighlight(index) {
    setForm((previous) => ({
      ...previous,
      highlights: previous.highlights.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  }

  function validateForm() {
    if (!form.title.trim()) return "Enter an event title.";

    if (!form.description.trim() || !getPlainText(form.description)) {
      return "Enter an event description.";
    }

    if (getPlainText(form.description).length < 10) {
      return "Event description must contain at least 10 characters.";
    }

    if (form.category === "other" && !form.categoryLabel.trim()) {
      return "Enter a name for the custom event category.";
    }

    if (!form.venue.trim()) return "Enter the event venue.";

    if (!form.address.trim()) return "Enter the event address.";

    if (!form.startDate) return "Select the event start date.";

    if (!form.endDate) return "Select the event end date.";

    // Times are optional. When omitted, the event spans the full selected day:
    // 12:00 AM for the start and 11:59:59 PM for the end (Nigeria time).
    const start = new Date(toLagosIso(form.startDate, form.startTime));
    const end = new Date(toLagosIso(form.endDate, form.endTime, true));

    if (end <= start) {
      return "Event end date and time must be after the start date and time.";
    }

    if (!coverFile) {
      return "Upload an event cover image.";
    }

    const urlErrors = [
      validateUrl(form.ticketUrl, "Ticket URL"),
      validateUrl(form.registrationUrl, "Registration URL"),
      validateUrl(form.organiserWebsite, "Organiser website"),
    ].filter(Boolean);

    if (urlErrors.length) return urlErrors[0];

    if (
      form.organiserEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.organiserEmail.trim())
    ) {
      return "Enter a valid organiser email address.";
    }

    const invalidHighlight = form.highlights.some(
      (item) => item.trim().length > 250,
    );

    if (invalidHighlight) {
      return "Each event highlight must not exceed 250 characters.";
    }

    return "";
  }

  async function handleSubmit(event, publishStatus = form.isPublished) {
    event.preventDefault();

    if (saving) return;

    setPageError("");
    setSuccessMessage("");
    setImageError("");

    const validationError = validateForm();

    if (validationError) {
      setPageError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);

    try {
      const body = new FormData();

      body.append("title", form.title.trim());
      body.append("slug", slugify(form.slug || form.title));
      body.append("description", form.description.trim());
      body.append("shortDescription", form.shortDescription.trim());

      const selectedCategory = EVENT_CATEGORIES.find(
        (category) => category.value === form.category,
      );

      body.append(
        "category",
        form.category === "other" ? slugify(form.categoryLabel) : form.category,
      );

      body.append(
        "categoryLabel",
        form.category === "other"
          ? form.categoryLabel.trim()
          : selectedCategory?.label || "",
      );

      body.append(
        "highlights",
        JSON.stringify(
          form.highlights.map((item) => item.trim()).filter(Boolean),
        ),
      );

      body.append("venue", form.venue.trim());
      body.append("address", form.address.trim());
      body.append("city", form.city.trim() || "Kaduna");
      body.append("lga", form.lga.trim());
      body.append("state", form.state.trim() || "Kaduna");
      body.append("timezone", "Africa/Lagos");

      body.append("startDate", toLagosIso(form.startDate, form.startTime));
      body.append("endDate", toLagosIso(form.endDate, form.endTime, true));

      body.append("organiser", form.organiser.trim());
      body.append("organiserDescription", form.organiserDescription.trim());
      body.append("organiserWebsite", form.organiserWebsite.trim());
      body.append("organiserEmail", form.organiserEmail.trim());
      body.append("organiserPhone", form.organiserPhone.trim());

      body.append("ticketUrl", form.ticketUrl.trim());
      body.append("registrationUrl", form.registrationUrl.trim());
      body.append("ticketInformation", form.ticketInformation.trim());

      body.append("isPublished", String(Boolean(publishStatus)));
      body.append("isFeatured", String(Boolean(form.isFeatured)));

      if (form.latitude.trim() && form.longitude.trim()) {
        body.append("latitude", String(Number(form.latitude)));
        body.append("longitude", String(Number(form.longitude)));
      }

      body.append("coverImage", coverFile);

      // Gallery uploads are not limited to a fixed image count.
      galleryFiles.forEach((file) => {
        body.append("images", file);
      });

      await apiRequest("events", {
        method: "POST",
        body,
      });

      setSuccessMessage(
        publishStatus
          ? "Event created and published successfully."
          : "Event saved as a draft successfully.",
      );

      router.replace("/admin/events");
      router.refresh();
    } catch (error) {
      setPageError(
        error?.message || "Could not create this event. Please try again.",
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  const selectedCategoryLabel =
    EVENT_CATEGORIES.find((category) => category.value === form.category)
      ?.label || "Event";

  return (
    <main className="mx-auto w-full max-w-7xl px-3 pb-10 pt-5 sm:px-5 sm:pt-8 lg:px-8">
      <div className="mb-6">
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#53715C] transition hover:text-[#103C2A]"
        >
          <ArrowLeft size={15} />
          Back to events
        </Link>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B28B42]">
              Kaduna Explorer Administration
            </span>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-[#103C2A] sm:text-3xl">
              Create an event
            </h1>

            <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500 sm:text-sm">
              Add an event to Kaduna Explorer and help visitors discover what is
              happening across Kaduna State.
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#EEF5EA] px-3 py-2 text-[10px] font-bold text-[#176B48]">
            <CalendarDays size={13} />
            New event
          </span>
        </div>
      </div>

      {pageError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-xs text-green-700"
        >
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {imageError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{imageError}</span>
        </div>
      )}

      <form
        onSubmit={(event) => handleSubmit(event, form.isPublished)}
        className="space-y-5"
      >
        {/* Basic information */}
        <section className="rounded-2xl border border-[#E4EAE1] bg-white p-4 shadow-[0_4px_20px_rgba(16,60,42,0.035)] sm:p-6">
          <SectionHeading
            icon={FileText}
            title="Event information"
            description="Start with the essential details visitors need to understand the event."
          />

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Event title" required>
                <input
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  maxLength={160}
                  placeholder="e.g. Kaduna International Festival"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Event URL slug">
              <input
                name="slug"
                value={form.slug}
                onChange={handleSlugChange}
                placeholder="event-url-slug"
                className={inputClass}
              />
            </Field>

            <Field label="Event category" required>
              <select
                name="category"
                value={form.category}
                onChange={updateField}
                className={inputClass}
              >
                {EVENT_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </Field>

            {form.category === "other" && (
              <div className="sm:col-span-2">
                <Field label="Custom category name" required>
                  <input
                    name="categoryLabel"
                    value={form.categoryLabel}
                    onChange={updateField}
                    maxLength={60}
                    placeholder="Enter your event category"
                    className={inputClass}
                  />
                </Field>
              </div>
            )}

            <div className="sm:col-span-2">
              <Field
                label="Short description"
                hint="A concise introduction for event cards and previews."
              >
                <textarea
                  name="shortDescription"
                  value={form.shortDescription}
                  onChange={updateField}
                  maxLength={300}
                  rows={3}
                  placeholder="Give visitors a quick overview of this event..."
                  className={textareaClass}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Full event description" required>
                <RichTextEditor
                  value={form.description}
                  onChange={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      description: value,
                    }))
                  }
                  editorRef={descriptionEditorRef}
                  className="px-4 py-3 text-xs leading-7 text-[#18352A] outline-none sm:text-sm"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#294638]">
                  Event highlights
                </span>

                <button
                  type="button"
                  onClick={addHighlight}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#EEF5EA] px-3 py-2 text-[10px] font-bold text-[#176B48] transition hover:bg-[#DCEBD7]"
                >
                  <Plus size={13} />
                  Add highlight
                </button>
              </div>

              <div className="space-y-2">
                {form.highlights.map((highlight, index) => (
                  <div key={index} className="flex min-w-0 gap-2">
                    <input
                      value={highlight}
                      onChange={(event) =>
                        updateHighlight(index, event.target.value)
                      }
                      maxLength={250}
                      placeholder={`Event highlight ${index + 1}`}
                      className={inputClass}
                    />

                    <button
                      type="button"
                      onClick={() => removeHighlight(index)}
                      disabled={form.highlights.length === 1}
                      aria-label={`Remove highlight ${index + 1}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DFE7DD] text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Event images */}
        <section className="rounded-2xl border border-[#E4EAE1] bg-white p-4 shadow-[0_4px_20px_rgba(16,60,42,0.035)] sm:p-6">
          <SectionHeading
            icon={ImagePlus}
            title="Event photography"
            description="Upload the main event cover and as many gallery images as you need."
          />

          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCoverChange}
            className="hidden"
          />

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleGalleryChange}
            className="hidden"
          />

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-bold text-[#294638]">
                Cover image <span className="text-red-500">*</span>
              </div>

              {coverPreview ? (
                <ImagePreview
                  file={coverFile}
                  url={coverPreview}
                  label="Event cover"
                  onRemove={() => setCoverFile(null)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="flex min-h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D8E5D5] bg-[#F9FBF7] p-5 text-center transition hover:border-[#176B48] hover:bg-[#F1F7EE]"
                >
                  <Upload size={23} className="text-[#176B48]" />

                  <span className="mt-3 text-xs font-extrabold text-[#18352A]">
                    Upload cover image
                  </span>

                  <span className="mt-1 text-[10px] text-slate-400">
                    JPG, PNG or WebP · Maximum 5 MB
                  </span>
                </button>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#294638]">
                  Gallery images
                </span>

                <span className="text-[10px] text-slate-400">
                  {galleryFiles.length} selected
                </span>
              </div>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex min-h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D8E5D5] bg-[#F9FBF7] p-5 text-center transition hover:border-[#176B48] hover:bg-[#F1F7EE]"
              >
                <ImagePlus size={23} className="text-[#176B48]" />

                <span className="mt-3 text-xs font-extrabold text-[#18352A]">
                  Add gallery images
                </span>

                <span className="mt-1 text-[10px] text-slate-400">
                  Select multiple images. No fixed gallery count.
                </span>
              </button>
            </div>
          </div>

          {galleryPreviews.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-3 text-xs font-bold text-[#294638]">
                Selected gallery images
              </h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {galleryPreviews.map(({ file, url }, index) => (
                  <ImagePreview
                    key={`${file.name}-${file.lastModified}-${index}`}
                    file={file}
                    url={url}
                    label={`Gallery image ${index + 1}`}
                    onRemove={() => removeGalleryImage(index)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Schedule */}
        <section className="rounded-2xl border border-[#E4EAE1] bg-white p-4 shadow-[0_4px_20px_rgba(16,60,42,0.035)] sm:p-6">
          <SectionHeading
            icon={CalendarDays}
            title="Event schedule"
            description="Start and end dates are required. Times are optional. All dates and times use Nigeria time."
          />

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Start date" required>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={updateField}
                className={inputClass}
              />
            </Field>

            <Field
              label="Start time"
              hint="Optional. Leave blank if the organiser has not announced a time."
            >
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={updateField}
                className={inputClass}
              />
            </Field>

            <Field label="End date" required>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={updateField}
                min={form.startDate || undefined}
                className={inputClass}
              />
            </Field>

            <Field
              label="End time"
              hint="Optional. Leave blank if the organiser has not announced a time."
            >
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={updateField}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        {/* Venue and location */}
        <section className="rounded-2xl border border-[#E4EAE1] bg-white p-4 shadow-[0_4px_20px_rgba(16,60,42,0.035)] sm:p-6">
          <SectionHeading
            icon={MapPin}
            title="Venue and location"
            description="Help visitors identify exactly where the event will take place."
          />

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Venue name" required>
              <input
                name="venue"
                value={form.venue}
                onChange={updateField}
                maxLength={200}
                placeholder="e.g. Ahmadu Bello Stadium"
                className={inputClass}
              />
            </Field>

            <Field label="City">
              <input
                name="city"
                value={form.city}
                onChange={updateField}
                maxLength={100}
                placeholder="Kaduna"
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Full address" required>
                <input
                  name="address"
                  value={form.address}
                  onChange={updateField}
                  maxLength={500}
                  placeholder="Enter the complete venue address..."
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Local Government Area">
              <input
                name="lga"
                value={form.lga}
                onChange={updateField}
                maxLength={100}
                placeholder="e.g. Kaduna North"
                className={inputClass}
              />
            </Field>

            <Field label="State">
              <input
                name="state"
                value={form.state}
                onChange={updateField}
                maxLength={100}
                placeholder="Kaduna"
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
              <div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-[#294638]">
                <Navigation size={15} className="text-[#176B48]" />
                Map coordinates
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Latitude">
                  <input
                    type="number"
                    name="latitude"
                    value={form.latitude}
                    onChange={updateField}
                    min="-90"
                    max="90"
                    step="any"
                    placeholder="e.g. 10.5222"
                    className={inputClass}
                  />
                </Field>

                <Field label="Longitude">
                  <input
                    type="number"
                    name="longitude"
                    value={form.longitude}
                    onChange={updateField}
                    min="-180"
                    max="180"
                    step="any"
                    placeholder="e.g. 7.4383"
                    className={inputClass}
                  />
                </Field>
              </div>

              <p className="mt-2 text-[10px] leading-5 text-slate-400">
                Both coordinates must be provided together. Leave both empty if
                the venue coordinates are not available.
              </p>
            </div>
          </div>
        </section>

        {/* Organiser */}
        <section className="rounded-2xl border border-[#E4EAE1] bg-white p-4 shadow-[0_4px_20px_rgba(16,60,42,0.035)] sm:p-6">
          <SectionHeading
            icon={Building2}
            title="Event organiser"
            description="Provide information about the organisation or person responsible for the event."
          />

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Organiser name">
              <input
                name="organiser"
                value={form.organiser}
                onChange={updateField}
                maxLength={160}
                placeholder="Organisation or organiser name"
                className={inputClass}
              />
            </Field>

            <Field label="Organiser email">
              <input
                type="email"
                name="organiserEmail"
                value={form.organiserEmail}
                onChange={updateField}
                placeholder="organiser@example.com"
                className={inputClass}
              />
            </Field>

            <Field label="Organiser phone">
              <input
                type="tel"
                name="organiserPhone"
                value={form.organiserPhone}
                onChange={updateField}
                placeholder="Contact phone number"
                className={inputClass}
              />
            </Field>

            <Field label="Organiser website">
              <div className="relative">
                <Globe
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  name="organiserWebsite"
                  value={form.organiserWebsite}
                  onChange={updateField}
                  placeholder="https://..."
                  className={`${inputClass} pl-10`}
                />
              </div>
            </Field>

            <div className="sm:col-span-2">
              <Field label="Organiser description">
                <textarea
                  name="organiserDescription"
                  value={form.organiserDescription}
                  onChange={updateField}
                  maxLength={1000}
                  rows={3}
                  placeholder="Tell visitors about the event organiser..."
                  className={textareaClass}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* Tickets and registration */}
        <section className="rounded-2xl border border-[#E4EAE1] bg-white p-4 shadow-[0_4px_20px_rgba(16,60,42,0.035)] sm:p-6">
          <SectionHeading
            icon={Ticket}
            title="Tickets and registration"
            description="Add ticket and registration links so visitors can participate."
          />

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Ticket purchase URL">
              <input
                name="ticketUrl"
                value={form.ticketUrl}
                onChange={updateField}
                placeholder="https://..."
                className={inputClass}
              />
            </Field>

            <Field label="Registration URL">
              <input
                name="registrationUrl"
                value={form.registrationUrl}
                onChange={updateField}
                placeholder="https://..."
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Ticket information">
                <textarea
                  name="ticketInformation"
                  value={form.ticketInformation}
                  onChange={updateField}
                  maxLength={1000}
                  rows={3}
                  placeholder="Add ticket prices, entry requirements or registration instructions..."
                  className={textareaClass}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* Featured Experience */}
        <section className="rounded-2xl border border-[#E4EAE1] bg-white p-4 shadow-[0_4px_20px_rgba(16,60,42,0.035)] sm:p-6">
          <SectionHeading
            icon={Sparkles}
            title="Featured Experience"
            description="Choose whether this event should appear in the Featured Experiences carousel on the public Events page."
          />

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#DFE7DD] bg-[#F9FBF7] p-4 transition hover:border-[#B9CCB8]">
            <input
              type="checkbox"
              name="isFeatured"
              checked={form.isFeatured}
              onChange={updateField}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#176B48]"
            />

            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-[#18352A]">
                Show this event as a Featured Experience
                <span className="rounded-full bg-[#EEF5EA] px-2 py-1 text-[9px] font-bold text-[#176B48]">
                  Optional
                </span>
              </span>

              <span className="mt-1 block text-[10px] leading-5 text-slate-500">
                When enabled, this published event can appear in the Featured
                Experiences carousel. You can feature multiple events. Disabling
                this option keeps the event in the normal event listings.
              </span>
            </span>
          </label>
        </section>

        {/* Publishing */}
        <section className="rounded-2xl border border-[#E4EAE1] bg-white p-4 shadow-[0_4px_20px_rgba(16,60,42,0.035)] sm:p-6">
          <SectionHeading
            icon={Eye}
            title="Publication"
            description="Choose whether this event should be visible to visitors immediately."
          />

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#DFE7DD] bg-[#F9FBF7] p-4 transition hover:border-[#B9CCB8]">
            <input
              type="checkbox"
              name="isPublished"
              checked={form.isPublished}
              onChange={updateField}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#176B48]"
            />

            <span className="min-w-0">
              <span className="block text-xs font-extrabold text-[#18352A]">
                Publish this event immediately
              </span>

              <span className="mt-1 block text-[10px] leading-5 text-slate-500">
                When enabled, the event will be published and eligible to appear
                on the public Events page. Otherwise, it will remain a draft in
                the admin dashboard.
              </span>
            </span>
          </label>
        </section>

        {/* Actions */}
        <div className="sticky bottom-3 z-20 rounded-2xl border border-[#E1E8DE] bg-white/95 p-3 shadow-[0_8px_30px_rgba(16,60,42,0.10)] backdrop-blur-xl sm:p-4">
          <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
            <Link
              href="/admin/events"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#DFE7DD] px-5 py-3 text-xs font-bold text-[#53715C] transition hover:bg-[#F7F9F7] hover:text-[#103C2A]"
            >
              Cancel
            </Link>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={saving}
                onClick={(event) => handleSubmit(event, false)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#DCE7DA] px-5 py-3 text-xs font-bold text-[#176B48] transition hover:bg-[#EEF5EA] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving event..." : "Save as draft"}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#103C2A] px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#176B48] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Saving event...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    {form.isPublished ? "Create and publish" : "Create event"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      <p className="pb-2 text-center text-[10px] leading-5 text-slate-400">
        {selectedCategoryLabel} · Event dates use Africa/Lagos timezone.
      </p>
    </main>
  );
}
