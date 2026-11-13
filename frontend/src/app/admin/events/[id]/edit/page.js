"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  AlignJustify,
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

function toLagosDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toLagosTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function getImageUrl(image) {
  if (typeof image === "string") return image;
  return image?.url || "";
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

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
        <span className="max-w-[75%] truncate text-[10px] font-semibold text-white">
          {file?.name || label}
        </span>

        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-red-600 transition hover:bg-red-50"
          aria-label="Remove image"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    heading2: false,
    heading3: false,
    unorderedList: false,
    orderedList: false,
    justify: false,
  });

  const refreshToolbarState = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (
      !editor ||
      !selection?.anchorNode ||
      !editor.contains(selection.anchorNode)
    ) {
      return;
    }

    let currentNode = selection.anchorNode;
    if (currentNode.nodeType === Node.TEXT_NODE) {
      currentNode = currentNode.parentElement;
    }

    const currentBlock = currentNode?.closest?.(
      "p, div, h1, h2, h3, h4, h5, h6, li, blockquote",
    );
    const blockTag = currentBlock?.tagName?.toLowerCase();
    const isJustified =
      document.queryCommandState("justifyFull") ||
      currentBlock?.style?.textAlign === "justify";

    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      heading2: blockTag === "h2",
      heading3: blockTag === "h3",
      unorderedList: document.queryCommandState("insertUnorderedList"),
      orderedList: document.queryCommandState("insertOrderedList"),
      justify: isJustified,
    });
  }, []);

  useEffect(() => {
    const editor = editorRef.current;

    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = value || "";
    }
  }, [value]);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshToolbarState);
    return () => {
      document.removeEventListener("selectionchange", refreshToolbarState);
    };
  }, [refreshToolbarState]);

  function runCommand(command, commandValue = null) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);

    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      refreshToolbarState();
    }
  }

  function insertLink() {
    const url = window.prompt("Enter the link URL:");

    if (!url) return;

    try {
      const parsed = new URL(url);

      if (!["http:", "https:"].includes(parsed.protocol)) {
        window.alert("Only HTTP and HTTPS links are allowed.");
        return;
      }

      runCommand("createLink", parsed.href);
    } catch {
      window.alert("Enter a valid URL.");
    }
  }

  function handleInput() {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      refreshToolbarState();
    }
  }

  function handlePaste(event) {
    event.preventDefault();

    const text = event.clipboardData.getData("text/plain");

    document.execCommand("insertText", false, text);

    handleInput();
  }

  const toolbarButton =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-[#355343] transition-colors duration-150 hover:border-[#C6DACB] hover:bg-[#EAF2E9] hover:text-[#176B48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B48]/40";
  const activeToolbarButton =
    "!border-[#176B48] !bg-[#176B48] !text-white shadow-sm hover:!border-[#14583D] hover:!bg-[#14583D] hover:!text-white";
  const getToolbarButtonClass = (isActive) =>
    `${toolbarButton} ${isActive ? activeToolbarButton : ""}`;
  const keepEditorSelection = (event) => event.preventDefault();

  return (
    <div className="overflow-hidden rounded-xl border border-[#DFE7DD] bg-white transition focus-within:border-[#176B48] focus-within:ring-4 focus-within:ring-[#176B48]/10">
      <div className="flex flex-wrap items-center gap-1 border-b border-[#E7EDE5] bg-[#FAFCF9] p-2">
        <button
          type="button"
          className={getToolbarButtonClass(activeFormats.bold)}
          onMouseDown={keepEditorSelection}
          onClick={() => runCommand("bold")}
          title="Bold"
          aria-label="Bold"
          aria-pressed={activeFormats.bold}
        >
          <Bold size={15} />
        </button>

        <button
          type="button"
          className={getToolbarButtonClass(activeFormats.italic)}
          onMouseDown={keepEditorSelection}
          onClick={() => runCommand("italic")}
          title="Italic"
          aria-label="Italic"
          aria-pressed={activeFormats.italic}
        >
          <Italic size={15} />
        </button>

        <button
          type="button"
          className={getToolbarButtonClass(activeFormats.underline)}
          onMouseDown={keepEditorSelection}
          onClick={() => runCommand("underline")}
          title="Underline"
          aria-label="Underline"
          aria-pressed={activeFormats.underline}
        >
          <UnderlineIcon size={15} />
        </button>

        <span className="mx-1 h-5 w-px bg-[#DDE6DC]" />

        <button
          type="button"
          className={getToolbarButtonClass(activeFormats.heading2)}
          onMouseDown={keepEditorSelection}
          onClick={() => runCommand("formatBlock", "h2")}
          title="Heading 2"
          aria-label="Heading 2"
          aria-pressed={activeFormats.heading2}
        >
          <Heading1 size={16} />
        </button>

        <button
          type="button"
          className={getToolbarButtonClass(activeFormats.heading3)}
          onMouseDown={keepEditorSelection}
          onClick={() => runCommand("formatBlock", "h3")}
          title="Heading 3"
          aria-label="Heading 3"
          aria-pressed={activeFormats.heading3}
        >
          <Heading2 size={16} />
        </button>

        <span className="mx-1 h-5 w-px bg-[#DDE6DC]" />

        <button
          type="button"
          className={getToolbarButtonClass(activeFormats.unorderedList)}
          onMouseDown={keepEditorSelection}
          onClick={() => runCommand("insertUnorderedList")}
          title="Bulleted list"
          aria-label="Bulleted list"
          aria-pressed={activeFormats.unorderedList}
        >
          <List size={16} />
        </button>

        <button
          type="button"
          className={getToolbarButtonClass(activeFormats.orderedList)}
          onMouseDown={keepEditorSelection}
          onClick={() => runCommand("insertOrderedList")}
          title="Numbered list"
          aria-label="Numbered list"
          aria-pressed={activeFormats.orderedList}
        >
          <ListOrdered size={16} />
        </button>

        <span className="mx-1 h-5 w-px bg-[#DDE6DC]" />

        <button
          type="button"
          className={getToolbarButtonClass(activeFormats.justify)}
          onMouseDown={keepEditorSelection}
          onClick={() => runCommand("justifyFull")}
          title="Justify text"
          aria-label="Justify text"
          aria-pressed={activeFormats.justify}
        >
          <AlignJustify size={16} />
        </button>

        <span className="mx-1 h-5 w-px bg-[#DDE6DC]" />

        <button
          type="button"
          className={toolbarButton}
          onMouseDown={keepEditorSelection}
          onClick={insertLink}
          title="Insert link"
          aria-label="Insert link"
        >
          <Link2 size={15} />
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={refreshToolbarState}
        onMouseUp={refreshToolbarState}
        onPaste={handlePaste}
        className="min-h-[220px] px-4 py-4 text-sm leading-7 text-[#18352A] outline-none empty:before:text-slate-400 empty:before:content-['Write_your_event_description_here...'] [&_a]:text-[#176B48] [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6"
      />
    </div>
  );
}

function normalizeEventResponse(response) {
  return (
    response?.data?.event ||
    response?.event ||
    response?.data?.data?.event ||
    response?.data?.data ||
    response?.data ||
    response
  );
}

function normalizeHighlights(highlights) {
  if (!Array.isArray(highlights) || highlights.length === 0) {
    return [""];
  }

  return highlights.map((item) => String(item || ""));
}

function normalizeGallery(images) {
  if (!Array.isArray(images)) return [];

  return images
    .map((image) => {
      if (typeof image === "string") {
        return {
          url: image,
          publicId: "",
          alt: "",
        };
      }

      return {
        url: image?.url || "",
        publicId: image?.publicId || image?.public_id || "",
        alt: image?.alt || "",
      };
    })
    .filter((image) => image.url);
}

function normalizeEvent(event) {
  const location = event?.location || {};

  const latitude =
    event?.latitude ??
    location?.coordinates?.[1] ??
    event?.coordinates?.latitude ??
    "";

  const longitude =
    event?.longitude ??
    location?.coordinates?.[0] ??
    event?.coordinates?.longitude ??
    "";

  const startDate = event?.startDate || event?.startAt || "";
  const endDate = event?.endDate || event?.endAt || "";

  return {
    ...INITIAL_FORM,

    title: event?.title || event?.name || "",
    slug: event?.slug || "",
    category: event?.category || "music",
    categoryLabel: event?.categoryLabel || "",
    description: event?.description || "",
    shortDescription: event?.shortDescription || "",
    highlights: normalizeHighlights(event?.highlights),

    venue: event?.venue || "",
    address: event?.address || "",
    city: event?.city || "Kaduna",
    lga: event?.lga || "",
    state: event?.state || "Kaduna",

    latitude: latitude === null ? "" : String(latitude),
    longitude: longitude === null ? "" : String(longitude),

    startDate: toLagosDateInput(startDate),
    startTime: toLagosTimeInput(startDate),
    endDate: toLagosDateInput(endDate),
    endTime: toLagosTimeInput(endDate),

    organiser: event?.organiser || event?.organizer || "",
    organiserDescription: event?.organiserDescription || "",
    organiserWebsite: event?.organiserWebsite || "",
    organiserEmail: event?.organiserEmail || "",
    organiserPhone: event?.organiserPhone || "",

    ticketUrl: event?.ticketUrl || "",
    registrationUrl: event?.registrationUrl || "",
    ticketInformation: event?.ticketInformation || "",

    isPublished: Boolean(event?.isPublished),
    isFeatured: Boolean(event?.isFeatured),
  };
}

function getApiError(error) {
  return (
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = params?.id;

  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [event, setEvent] = useState(null);

  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [existingCover, setExistingCover] = useState("");

  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [existingGallery, setExistingGallery] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [removeCover, setRemoveCover] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    let active = true;

    async function loadEvent() {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await apiRequest(
          `events/admin/${encodeURIComponent(eventId)}`,
        );

        const eventData = normalizeEventResponse(response);

        if (!eventData || !(eventData._id || eventData.id)) {
          throw new Error(
            "The event could not be found in the server response.",
          );
        }

        if (!active) return;

        setEvent(eventData);
        setForm(normalizeEvent(eventData));

        const cover = getImageUrl(eventData.coverImage);

        setExistingCover(cover);
        setRemoveCover(false);

        setExistingGallery(
          normalizeGallery(eventData.images || eventData.gallery),
        );
      } catch (error) {
        if (!active) return;

        setErrorMessage(getApiError(error));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadEvent();

    return () => {
      active = false;
    };
  }, [eventId]);

  useEffect(() => {
    return () => {
      galleryPreviews.forEach((preview) => {
        if (preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });

      if (coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [galleryPreviews, coverPreview]);

  function updateForm(name, value) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  }

  function handleTitleChange(value) {
    setForm((previous) => ({
      ...previous,
      title: value,
      slug: slugify(value),
    }));

    setFieldErrors((previous) => ({
      ...previous,
      title: "",
      slug: "",
    }));
  }

  function handleSlugChange(value) {
    updateForm("slug", slugify(value));
  }

  function handleCoverSelection(event) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    const validationError = validateImage(file);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (coverPreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverImage(file);
    setCoverPreview(URL.createObjectURL(file));
    setRemoveCover(false);
    setErrorMessage("");
  }

  function removeSelectedCover() {
    if (coverPreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverImage(null);
    setCoverPreview("");
    setRemoveCover(true);
  }

  function handleGallerySelection(event) {
    const files = Array.from(event.target.files || []);

    event.target.value = "";

    if (!files.length) return;

    const validFiles = [];
    const errors = [];

    files.forEach((file) => {
      const validationError = validateImage(file);

      if (validationError) {
        errors.push(validationError);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length) {
      setErrorMessage(errors.join(" "));
    } else {
      setErrorMessage("");
    }

    if (!validFiles.length) return;

    const previews = validFiles.map((file) => URL.createObjectURL(file));

    setGalleryFiles((previous) => [...previous, ...validFiles]);
    setGalleryPreviews((previous) => [...previous, ...previews]);
  }

  function removeExistingGalleryImage(index) {
    setExistingGallery((previous) =>
      previous.filter((_, imageIndex) => imageIndex !== index),
    );
  }

  function removeNewGalleryImage(index) {
    const preview = galleryPreviews[index];

    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setGalleryFiles((previous) =>
      previous.filter((_, fileIndex) => fileIndex !== index),
    );

    setGalleryPreviews((previous) =>
      previous.filter((_, fileIndex) => fileIndex !== index),
    );
  }

  function updateHighlight(index, value) {
    setForm((previous) => ({
      ...previous,
      highlights: previous.highlights.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    }));
  }

  function addHighlight() {
    setForm((previous) => ({
      ...previous,
      highlights: [...previous.highlights, ""],
    }));
  }

  function removeHighlight(index) {
    setForm((previous) => ({
      ...previous,
      highlights:
        previous.highlights.length === 1
          ? [""]
          : previous.highlights.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function validateForm() {
    const errors = {};

    if (form.title.trim().length < 3) {
      errors.title = "Event title must contain at least 3 characters.";
    }

    if (!form.slug.trim()) {
      errors.slug = "Event URL slug is required.";
    }

    if (form.category === "other" && !form.categoryLabel.trim()) {
      errors.categoryLabel = "Enter the event category.";
    }

    if (getPlainText(form.description).length < 10) {
      errors.description = "Description must contain at least 10 characters.";
    }

    if (!form.venue.trim()) {
      errors.venue = "Venue is required.";
    }

    if (!form.address.trim()) {
      errors.address = "Event address is required.";
    }

    if (!form.startDate) {
      errors.startDate = "Event start date is required.";
    }

    if (!form.endDate) {
      errors.endDate = "Event end date is required.";
    }

    if (form.startDate && form.endDate) {
      const start = new Date(toLagosIso(form.startDate, form.startTime, false));

      const end = new Date(toLagosIso(form.endDate, form.endTime, true));

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        errors.startDate = "Enter valid event dates and times.";
      } else if (end <= start) {
        errors.endDate = "Event end must be after the start.";
      }
    }

    const hasLatitude = String(form.latitude).trim() !== "";
    const hasLongitude = String(form.longitude).trim() !== "";

    if (hasLatitude !== hasLongitude) {
      errors.latitude = "Enter both latitude and longitude.";
      errors.longitude = "Enter both latitude and longitude.";
    }

    if (hasLatitude && hasLongitude) {
      const latitude = Number(form.latitude);
      const longitude = Number(form.longitude);

      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        errors.latitude = "Enter a valid latitude.";
      }

      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        errors.longitude = "Enter a valid longitude.";
      }
    }

    const urlErrors = {
      organiserWebsite: validateUrl(form.organiserWebsite, "Organiser website"),
      ticketUrl: validateUrl(form.ticketUrl, "Ticket URL"),
      registrationUrl: validateUrl(form.registrationUrl, "Registration URL"),
    };

    Object.entries(urlErrors).forEach(([key, message]) => {
      if (message) errors[key] = message;
    });

    if (
      form.organiserEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.organiserEmail.trim())
    ) {
      errors.organiserEmail = "Enter a valid organiser email address.";
    }

    const hasCover = Boolean(coverImage || (!removeCover && existingCover));

    if (!hasCover) {
      errors.coverImage = "An event cover image is required.";
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(submitEvent, publishStatus = form.isPublished) {
    submitEvent?.preventDefault?.();

    if (saving) return;

    setErrorMessage("");
    setSuccessMessage("");

    if (!validateForm()) {
      setErrorMessage("Please review the highlighted fields.");
      return;
    }

    setSaving(true);

    try {
      const body = new FormData();

      const startDate = toLagosIso(form.startDate, form.startTime, false);

      const endDate = toLagosIso(form.endDate, form.endTime, true);

      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        category: form.category,
        categoryLabel:
          form.category === "other" ? form.categoryLabel.trim() : "",
        description: form.description,
        shortDescription: form.shortDescription.trim(),
        highlights: form.highlights.map((item) => item.trim()).filter(Boolean),

        venue: form.venue.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        lga: form.lga.trim(),
        state: form.state.trim(),

        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),

        startDate,
        endDate,
        timezone: "Africa/Lagos",

        organiser: form.organiser.trim(),
        organiserDescription: form.organiserDescription.trim(),
        organiserWebsite: form.organiserWebsite.trim(),
        organiserEmail: form.organiserEmail.trim(),
        organiserPhone: form.organiserPhone.trim(),

        ticketUrl: form.ticketUrl.trim(),
        registrationUrl: form.registrationUrl.trim(),
        ticketInformation: form.ticketInformation.trim(),

        isPublished: Boolean(publishStatus),
        isFeatured: Boolean(form.isFeatured),

        // Send only the gallery images that should remain on the event.
        // The backend reconciles this list with the saved gallery and deletes removed Cloudinary assets.
        images: existingGallery,
        removeCoverImage: removeCover,
      };

      Object.entries(payload).forEach(([key, value]) => {
        if (key === "images") {
          body.append(key, JSON.stringify(value));
        } else if (value !== null && value !== undefined) {
          body.append(
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value),
          );
        }
      });

      if (coverImage) {
        body.append("coverImage", coverImage);
      }

      galleryFiles.forEach((file) => {
        body.append("images", file);
      });

      await apiRequest(`events/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        body,
      });

      setSuccessMessage(
        publishStatus
          ? "Event updated and published successfully."
          : "Event saved as a draft successfully.",
      );

      router.replace("/admin/events");
      router.refresh();
    } catch (error) {
      setErrorMessage(getApiError(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-[#F7F9F7]">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="animate-spin text-[#176B48]" size={34} />
          <p className="text-sm font-semibold text-[#456052]">
            Loading event details...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage && !event) {
    return (
      <div className="min-h-[65vh] bg-[#F7F9F7] px-4 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-100 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle size={23} />
          </div>

          <h1 className="mt-4 text-xl font-extrabold text-[#103C2A]">
            Unable to load this event
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {errorMessage}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#176B48] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#103C2A]"
            >
              Try again
            </button>

            <Link
              href="/admin/events"
              className="rounded-xl border border-[#DCE6DA] px-5 py-3 text-sm font-bold text-[#294638] transition hover:bg-[#F7F9F7]"
            >
              Back to events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentCover = coverPreview || (removeCover ? "" : existingCover);

  return (
    <div className="min-h-screen bg-[#F7F9F7] px-3 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/admin/events"
              className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-[#52705D] transition hover:text-[#176B48]"
            >
              <ArrowLeft size={15} />
              Back to Events
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2E9] text-[#176B48]">
                <CalendarDays size={21} />
              </div>

              <div>
                <h1 className="text-xl font-black tracking-tight text-[#103C2A] sm:text-2xl">
                  Edit Event
                </h1>

                <p className="mt-1 text-xs text-slate-500">
                  Update the details, schedule, images and visibility of this
                  event.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${
                form.isPublished
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {form.isPublished ? "PUBLISHED" : "DRAFT"}
            </span>

            {event?.slug && (
              <Link
                href={`/events/${event.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl border border-[#DCE6DA] bg-white px-3.5 py-2.5 text-xs font-bold text-[#294638] transition hover:border-[#176B48] hover:text-[#176B48]"
              >
                <Eye size={15} />
                Preview event
              </Link>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={17} />
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 shrink-0" size={17} />
            <p>{successMessage}</p>
          </div>
        )}

        <form
          onSubmit={(submitEvent) =>
            handleSubmit(submitEvent, form.isPublished)
          }
          className="space-y-6"
        >
          {/* EVENT INFORMATION */}
          <section className="rounded-2xl border border-[#E2E9DF] bg-white p-4 shadow-sm sm:p-6">
            <SectionHeading
              icon={FileText}
              title="Event information"
              description="The main information visitors will see when they discover your event."
            />

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Event title" required>
                  <input
                    className={inputClass}
                    value={form.title}
                    onChange={(event) => handleTitleChange(event.target.value)}
                    placeholder="e.g. Arewa Fashion and Food Festival"
                  />
                  {fieldErrors.title && (
                    <p className="mt-1 text-xs text-red-600">
                      {fieldErrors.title}
                    </p>
                  )}
                </Field>
              </div>

              <Field label="Event URL slug" required>
                <input
                  className={inputClass}
                  value={form.slug}
                  onChange={(event) => handleSlugChange(event.target.value)}
                  placeholder="arewa-fashion-food-festival"
                />
                {fieldErrors.slug && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.slug}
                  </p>
                )}
              </Field>

              <Field label="Category" required>
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(event) =>
                    updateForm("category", event.target.value)
                  }
                >
                  {EVENT_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </Field>

              {form.category === "other" && (
                <div className="md:col-span-2">
                  <Field label="Custom category name" required>
                    <input
                      className={inputClass}
                      value={form.categoryLabel}
                      onChange={(event) =>
                        updateForm("categoryLabel", event.target.value)
                      }
                      placeholder="Enter category name"
                    />
                    {fieldErrors.categoryLabel && (
                      <p className="mt-1 text-xs text-red-600">
                        {fieldErrors.categoryLabel}
                      </p>
                    )}
                  </Field>
                </div>
              )}

              <div className="md:col-span-2">
                <Field
                  label="Short description"
                  hint="A concise summary for event cards and previews."
                >
                  <textarea
                    className={textareaClass}
                    rows={3}
                    maxLength={300}
                    value={form.shortDescription}
                    onChange={(event) =>
                      updateForm("shortDescription", event.target.value)
                    }
                    placeholder="Briefly introduce this event..."
                  />
                  <p className="mt-1 text-right text-[10px] text-slate-400">
                    {form.shortDescription.length}/300
                  </p>
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field
                  label="Full event description"
                  required
                  hint="Use the formatting toolbar to organise the event description."
                >
                  <RichTextEditor
                    value={form.description}
                    onChange={(value) => updateForm("description", value)}
                  />
                  {fieldErrors.description && (
                    <p className="mt-1 text-xs text-red-600">
                      {fieldErrors.description}
                    </p>
                  )}
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field
                  label="Event highlights"
                  hint="Add the main activities or attractions visitors should expect."
                >
                  <div className="space-y-2">
                    {form.highlights.map((highlight, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          className={inputClass}
                          value={highlight}
                          onChange={(event) =>
                            updateHighlight(index, event.target.value)
                          }
                          placeholder={`Highlight ${index + 1}`}
                        />

                        <button
                          type="button"
                          onClick={() => removeHighlight(index)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E2E9DF] text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove highlight"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addHighlight}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#176B48] transition hover:text-[#103C2A]"
                  >
                    <Plus size={15} />
                    Add highlight
                  </button>
                </Field>
              </div>
            </div>
          </section>

          {/* EVENT DATE AND TIME */}
          <section className="rounded-2xl border border-[#E2E9DF] bg-white p-4 shadow-sm sm:p-6">
            <SectionHeading
              icon={Clock3}
              title="Event schedule"
              description="Set the dates and optional start and end times. All event times use Nigeria time."
            />

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Start date" required>
                <input
                  type="date"
                  className={inputClass}
                  value={form.startDate}
                  onChange={(event) =>
                    updateForm("startDate", event.target.value)
                  }
                />
                {fieldErrors.startDate && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.startDate}
                  </p>
                )}
              </Field>

              <Field label="Start time" hint="Optional">
                <input
                  type="time"
                  className={inputClass}
                  value={form.startTime}
                  onChange={(event) =>
                    updateForm("startTime", event.target.value)
                  }
                />
              </Field>

              <Field label="End date" required>
                <input
                  type="date"
                  className={inputClass}
                  min={form.startDate || undefined}
                  value={form.endDate}
                  onChange={(event) =>
                    updateForm("endDate", event.target.value)
                  }
                />
                {fieldErrors.endDate && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.endDate}
                  </p>
                )}
              </Field>

              <Field label="End time" hint="Optional">
                <input
                  type="time"
                  className={inputClass}
                  value={form.endTime}
                  onChange={(event) =>
                    updateForm("endTime", event.target.value)
                  }
                />
              </Field>
            </div>

            <p className="mt-4 rounded-xl bg-[#F5F8F3] px-4 py-3 text-[11px] leading-5 text-[#55705E]">
              Dates and times are saved using the Africa/Lagos timezone. If you
              leave a time empty, the event starts at midnight or ends at 11:59
              PM on the selected date.
            </p>
          </section>

          {/* LOCATION */}
          <section className="rounded-2xl border border-[#E2E9DF] bg-white p-4 shadow-sm sm:p-6">
            <SectionHeading
              icon={MapPin}
              title="Event location"
              description="Help visitors find the event venue and navigate to it."
            />

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Venue name" required>
                <input
                  className={inputClass}
                  value={form.venue}
                  onChange={(event) => updateForm("venue", event.target.value)}
                  placeholder="e.g. Lumana Center"
                />
                {fieldErrors.venue && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.venue}
                  </p>
                )}
              </Field>

              <Field label="City">
                <input
                  className={inputClass}
                  value={form.city}
                  onChange={(event) => updateForm("city", event.target.value)}
                  placeholder="Kaduna"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Full address" required>
                  <textarea
                    className={textareaClass}
                    rows={2}
                    value={form.address}
                    onChange={(event) =>
                      updateForm("address", event.target.value)
                    }
                    placeholder="Enter the full event address..."
                  />
                  {fieldErrors.address && (
                    <p className="mt-1 text-xs text-red-600">
                      {fieldErrors.address}
                    </p>
                  )}
                </Field>
              </div>

              <Field label="Local Government Area">
                <input
                  className={inputClass}
                  value={form.lga}
                  onChange={(event) => updateForm("lga", event.target.value)}
                  placeholder="e.g. Kaduna North"
                />
              </Field>

              <Field label="State">
                <input
                  className={inputClass}
                  value={form.state}
                  onChange={(event) => updateForm("state", event.target.value)}
                  placeholder="Kaduna"
                />
              </Field>

              <div className="sm:col-span-2">
                <div className="mb-3 flex items-center gap-2">
                  <Navigation size={16} className="text-[#176B48]" />
                  <h3 className="text-xs font-extrabold text-[#294638]">
                    GPS coordinates
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Latitude">
                    <input
                      type="number"
                      step="any"
                      className={inputClass}
                      value={form.latitude}
                      onChange={(event) =>
                        updateForm("latitude", event.target.value)
                      }
                      placeholder="e.g. 10.5105"
                    />
                    {fieldErrors.latitude && (
                      <p className="mt-1 text-xs text-red-600">
                        {fieldErrors.latitude}
                      </p>
                    )}
                  </Field>

                  <Field label="Longitude">
                    <input
                      type="number"
                      step="any"
                      className={inputClass}
                      value={form.longitude}
                      onChange={(event) =>
                        updateForm("longitude", event.target.value)
                      }
                      placeholder="e.g. 7.4165"
                    />
                    {fieldErrors.longitude && (
                      <p className="mt-1 text-xs text-red-600">
                        {fieldErrors.longitude}
                      </p>
                    )}
                  </Field>
                </div>

                <p className="mt-2 text-[10px] text-slate-400">
                  Enter both coordinates or leave both empty.
                </p>
              </div>
            </div>
          </section>

          {/* EVENT IMAGES */}
          <section className="rounded-2xl border border-[#E2E9DF] bg-white p-4 shadow-sm sm:p-6">
            <SectionHeading
              icon={ImagePlus}
              title="Event images"
              description="Manage the event cover and gallery images."
            />

            <div className="mt-6">
              <Field
                label="Cover image"
                required
                hint="JPG, PNG or WebP. Maximum 5 MB."
              >
                <div className="mt-2">
                  {currentCover ? (
                    <div className="relative overflow-hidden rounded-2xl border border-[#DFE7DD]">
                      <img
                        src={currentCover}
                        alt={form.title || "Event cover"}
                        className="h-56 w-full object-cover sm:h-72"
                      />

                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
                        <span className="text-xs font-bold text-white">
                          {coverImage
                            ? "New cover image"
                            : "Current cover image"}
                        </span>

                        <button
                          type="button"
                          onClick={removeSelectedCover}
                          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#C9D9C7] bg-[#FAFCF9] px-4 py-8 text-center transition hover:border-[#176B48] hover:bg-[#F2F7F0]"
                    >
                      <Upload size={25} className="text-[#176B48]" />
                      <span className="mt-3 text-sm font-bold text-[#294638]">
                        Upload cover image
                      </span>
                      <span className="mt-1 text-[11px] text-slate-400">
                        JPG, PNG or WebP
                      </span>
                    </button>
                  )}

                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCoverSelection}
                    className="hidden"
                  />

                  {currentCover && (
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#DCE6DA] px-3 py-2 text-xs font-bold text-[#176B48] transition hover:bg-[#F5F8F3]"
                    >
                      <Upload size={14} />
                      Replace cover image
                    </button>
                  )}

                  {fieldErrors.coverImage && (
                    <p className="mt-2 text-xs text-red-600">
                      {fieldErrors.coverImage}
                    </p>
                  )}
                </div>
              </Field>
            </div>

            <div className="mt-8">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-xs font-extrabold text-[#294638]">
                    Gallery images
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Add as many valid gallery images as needed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#C9D9C7] px-4 py-2.5 text-xs font-bold text-[#176B48] transition hover:border-[#176B48] hover:bg-[#F5F8F3]"
                >
                  <Plus size={15} />
                  Add gallery images
                </button>
              </div>

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleGallerySelection}
                className="hidden"
              />

              {(existingGallery.length > 0 || galleryFiles.length > 0) && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {existingGallery.map((image, index) => (
                    <ImagePreview
                      key={`existing-${image.publicId || image.url}-${index}`}
                      url={image.url}
                      label="Existing gallery image"
                      onRemove={() => removeExistingGalleryImage(index)}
                    />
                  ))}

                  {galleryFiles.map((file, index) => (
                    <ImagePreview
                      key={`${file.name}-${file.size}-${index}`}
                      file={file}
                      url={galleryPreviews[index]}
                      label="New gallery image"
                      onRemove={() => removeNewGalleryImage(index)}
                    />
                  ))}
                </div>
              )}

              {existingGallery.length === 0 && galleryFiles.length === 0 && (
                <div className="mt-4 rounded-xl border border-dashed border-[#DCE6DA] bg-[#FAFCF9] px-4 py-8 text-center">
                  <ImagePlus className="mx-auto text-[#8DA894]" size={25} />
                  <p className="mt-2 text-xs font-semibold text-[#55705E]">
                    No gallery images added
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Your event can still be displayed with its cover image.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ORGANISER INFORMATION */}
          <section className="rounded-2xl border border-[#E2E9DF] bg-white p-4 shadow-sm sm:p-6">
            <SectionHeading
              icon={Building2}
              title="Organiser information"
              description="Provide details about the organisation hosting the event."
            />

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Organiser name">
                <input
                  className={inputClass}
                  value={form.organiser}
                  onChange={(event) =>
                    updateForm("organiser", event.target.value)
                  }
                  placeholder="Organisation or event host"
                />
              </Field>

              <Field label="Organiser phone">
                <input
                  type="tel"
                  className={inputClass}
                  value={form.organiserPhone}
                  onChange={(event) =>
                    updateForm("organiserPhone", event.target.value)
                  }
                  placeholder="+234..."
                />
              </Field>

              <Field label="Organiser email">
                <input
                  type="email"
                  className={inputClass}
                  value={form.organiserEmail}
                  onChange={(event) =>
                    updateForm("organiserEmail", event.target.value)
                  }
                  placeholder="organiser@example.com"
                />
                {fieldErrors.organiserEmail && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.organiserEmail}
                  </p>
                )}
              </Field>

              <Field label="Organiser website">
                <input
                  className={inputClass}
                  value={form.organiserWebsite}
                  onChange={(event) =>
                    updateForm("organiserWebsite", event.target.value)
                  }
                  placeholder="https://example.com"
                />
                {fieldErrors.organiserWebsite && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.organiserWebsite}
                  </p>
                )}
              </Field>

              <div className="sm:col-span-2">
                <Field label="About the organiser">
                  <textarea
                    className={textareaClass}
                    rows={3}
                    value={form.organiserDescription}
                    onChange={(event) =>
                      updateForm("organiserDescription", event.target.value)
                    }
                    placeholder="Tell visitors about the event organiser..."
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* TICKETS AND REGISTRATION */}
          <section className="rounded-2xl border border-[#E2E9DF] bg-white p-4 shadow-sm sm:p-6">
            <SectionHeading
              icon={Ticket}
              title="Tickets and registration"
              description="Provide ticketing and registration information where applicable."
            />

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Ticket purchase URL">
                <input
                  className={inputClass}
                  value={form.ticketUrl}
                  onChange={(event) =>
                    updateForm("ticketUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
                {fieldErrors.ticketUrl && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.ticketUrl}
                  </p>
                )}
              </Field>

              <Field label="Registration URL">
                <input
                  className={inputClass}
                  value={form.registrationUrl}
                  onChange={(event) =>
                    updateForm("registrationUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
                {fieldErrors.registrationUrl && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.registrationUrl}
                  </p>
                )}
              </Field>

              <div className="sm:col-span-2">
                <Field label="Ticket information">
                  <textarea
                    className={textareaClass}
                    rows={3}
                    value={form.ticketInformation}
                    onChange={(event) =>
                      updateForm("ticketInformation", event.target.value)
                    }
                    placeholder="Describe ticket prices, tiers, entry requirements or registration details..."
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* PUBLISHING */}
          <section className="rounded-2xl border border-[#E2E9DF] bg-white p-4 shadow-sm sm:p-6">
            <SectionHeading
              icon={Sparkles}
              title="Event visibility"
              description="Choose whether the updated event should remain a draft or be published."
            />

            <div className="mt-5 flex flex-col gap-4 rounded-xl border border-[#E5ECE2] bg-[#FAFCF9] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-extrabold text-[#294638]">
                  {form.isPublished ? "Published event" : "Draft event"}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {form.isPublished
                    ? "This event is visible to visitors."
                    : "This event is not currently visible in the public events listing."}
                </p>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-3">
                <span className="text-xs font-bold text-[#456052]">
                  Publish event
                </span>

                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(event) =>
                    updateForm("isPublished", event.target.checked)
                  }
                  className="peer sr-only"
                />

                <span className="relative h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-[#176B48] peer-focus-visible:ring-4 peer-focus-visible:ring-[#176B48]/20 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-5" />
              </label>
            </div>
          </section>

          {/* FEATURED EXPERIENCE */}
          <section className="rounded-2xl border border-[#E2E9DF] bg-white p-4 shadow-sm sm:p-6">
            <SectionHeading
              icon={Sparkles}
              title="Featured experience"
              description="Choose whether this event should appear in the featured experiences carousel on the public Events page."
            />

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#E5ECE2] bg-[#FAFCF9] p-4 transition hover:border-[#B9CCB8]">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) =>
                  updateForm("isFeatured", event.target.checked)
                }
                className="mt-1 h-4 w-4 shrink-0 accent-[#176B48]"
              />

              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-[#294638]">
                  Feature this event
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  When enabled, this event can appear in the featured carousel.
                  You can feature multiple events. When disabled, it remains in
                  the normal events listing only.
                </span>
              </span>
            </label>
          </section>

          {/* FORM ACTIONS */}
          <div className="sticky bottom-3 z-20 rounded-2xl border border-[#E2E9DF] bg-white/95 p-3 shadow-lg backdrop-blur-xl sm:p-4">
            <div className="grid grid-cols-[minmax(0,0.78fr)_minmax(0,2.22fr)] items-center gap-2 sm:flex sm:items-center sm:justify-between">
              <Link
                href="/admin/events"
                className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-[#DFE7DD] px-2 text-[9px] font-bold text-[#456052] transition hover:bg-[#F5F8F3] min-[360px]:gap-1.5 min-[360px]:px-2.5 min-[360px]:text-[10px] sm:gap-2 sm:px-5 sm:text-xs"
              >
                <ArrowLeft size={15} />
                Cancel
              </Link>

              <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  disabled={saving}
                  onClick={(event) => handleSubmit(event, false)}
                  className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-[#C9D9C7] px-1.5 text-[9px] font-extrabold text-[#176B48] transition hover:bg-[#F2F7F0] disabled:cursor-not-allowed disabled:opacity-60 min-[360px]:gap-1.5 min-[360px]:px-2 min-[360px]:text-[10px] sm:gap-2 sm:px-5 sm:text-xs"
                >
                  {saving ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <FileText size={15} />
                  )}
                  Save draft
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl bg-[#176B48] px-1.5 text-[9px] font-extrabold text-white shadow-sm transition hover:bg-[#103C2A] disabled:cursor-not-allowed disabled:opacity-60 min-[360px]:gap-1.5 min-[360px]:px-2 min-[360px]:text-[10px] sm:gap-2 sm:px-5 sm:text-xs"
                >
                  {saving ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  {form.isPublished ? "Save changes" : "Publish event"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
