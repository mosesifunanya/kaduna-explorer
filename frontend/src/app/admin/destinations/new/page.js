"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  ImagePlus,
  Images,
  LoaderCircle,
  MapPin,
  MapPinned,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { apiRequest } from "@/lib/api";

const DestinationMap = dynamic(
  () => import("@/app/admin/components/DestinationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-80 items-center justify-center bg-[#F8FAF6] text-sm text-slate-500">
        Loading interactive map...
      </div>
    ),
  },
);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const CATEGORIES = [
  { value: "attraction", label: "Tourist attraction" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "cafe", label: "Cafe" },
  { value: "park", label: "Park and garden" },
  { value: "nature", label: "Nature and wildlife" },
  { value: "culture", label: "Culture and heritage" },
  { value: "historical-site", label: "Historical site" },
  { value: "shopping", label: "Shopping centre and mall" },
  { value: "market", label: "Market and local shopping" },
  { value: "entertainment", label: "Entertainment" },
  { value: "sports", label: "Sports and recreation" },
  { value: "event", label: "Event and festival" },
  { value: "nightlife", label: "Nightlife" },
  { value: "hospital", label: "Hospital" },
  { value: "clinic", label: "Clinic and medical centre" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "school", label: "School and educational institution" },
  { value: "university", label: "University and college" },
  { value: "religious-site", label: "Religious site" },
  { value: "mosque", label: "Mosque" },
  { value: "church", label: "Church" },
  { value: "government-office", label: "Government office" },
  { value: "police-station", label: "Police station" },
  { value: "bank", label: "Bank and ATM" },
  { value: "transport", label: "Transport terminal" },
  { value: "airport", label: "Airport" },
  { value: "hotel-service", label: "Guest house and accommodation" },
  { value: "fuel-station", label: "Fuel station" },
  { value: "conference-centre", label: "Conference and event centre" },
  { value: "museum", label: "Museum and gallery" },
  { value: "library", label: "Library" },
  { value: "farm", label: "Farm and agricultural tourism" },
  { value: "waterfall", label: "Waterfall and water attraction" },
  { value: "viewpoint", label: "Scenic viewpoint" },
  { value: "service", label: "Other service" },
  { value: "other", label: "Other" },
];

const PRICE_LEVELS = [
  { value: "unknown", label: "Not specified" },
  { value: "free", label: "Free" },
  { value: "budget", label: "Budget friendly" },
  { value: "moderate", label: "Moderate" },
  { value: "expensive", label: "Premium" },
];

const INITIAL_FORM = {
  name: "",
  shortDescription: "",
  category: "attraction",
  categoryLabel: "",
  address: "",
  city: "",
  lga: "",
  state: "Kaduna",
  contactPhone: "",
  website: "",
  priceLevel: "unknown",
  latitude: "",
  longitude: "",
  isPublished: false,
};

const inputClass =
  "w-full rounded-xl border border-[#DFE6DC] bg-white px-3.5 py-3 text-sm text-[#18352A] outline-none transition placeholder:text-slate-400 focus:border-[#7EAC8A] focus:ring-4 focus:ring-[#176B48]/[0.07]";

function FieldLabel({ children, htmlFor, required = false }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-xs font-bold text-[#294638]"
    >
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder = "",
  maxLength,
  step,
  autoComplete,
}) {
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={name} required={required}>
        {label}
      </FieldLabel>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        step={step}
        autoComplete={autoComplete}
        className={inputClass}
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
}) {
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={name} required={required}>
        {label}
      </FieldLabel>

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FormSection({ icon: Icon, title, description, children }) {
  return (
    <section className="overflow-visible rounded-2xl border border-[#E4E8DF] bg-white shadow-sm shadow-[#103C2A]/[0.025]">
      <div className="flex items-start gap-3 border-b border-[#EDF0E9] px-4 py-4 sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF4E9] text-[#176B48]">
          <Icon size={19} />
        </div>

        <div>
          <h2 className="text-sm font-extrabold text-[#103C2A] sm:text-base">
            {title}
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">{children}</div>
    </section>
  );
}

function ImageUploadBox({
  title,
  description,
  inputRef,
  onChange,
  preview = "",
  fileName = "",
  onRemove,
  multiple = false,
}) {
  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        onChange={onChange}
        className="hidden"
      />

      {preview ? (
        <div className="overflow-hidden rounded-xl border border-[#DFE6DC] bg-[#F8FAF6]">
          <div className="flex min-h-72 items-center justify-center bg-[#F8FAF6] p-4 sm:min-h-[420px]">
            <img
              src={preview}
              alt={fileName || title}
              className="max-h-[360px] w-full rounded-lg object-contain sm:max-h-[500px]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E8DF] bg-white px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[#294638]">
                {fileName || "Image preview"}
              </p>

              <p className="mt-1 text-[10px] text-slate-500">
                Preview of the selected cover image
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border border-[#DFE6DC] px-3 py-2 text-xs font-bold text-[#294638] transition hover:bg-[#F8FAF6]"
              >
                Replace
              </button>

              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group flex min-h-48 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D6E1D1] bg-[#F9FBF7] px-5 py-8 text-center transition hover:border-[#83AA86] hover:bg-[#F1F7ED]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF3E5] text-[#176B48] transition group-hover:bg-[#DCEBD5]">
            <Upload size={21} />
          </span>

          <span className="mt-4 text-sm font-extrabold text-[#18352A]">
            {title}
          </span>

          <span className="mt-2 max-w-md text-xs leading-5 text-slate-500">
            {description}
          </span>

          <span className="mt-4 rounded-lg bg-[#103C2A] px-4 py-2.5 text-xs font-bold text-white transition group-hover:bg-[#176B48]">
            Browse files
          </span>
        </button>
      )}

      {!preview && (
        <p className="text-[10px] leading-5 text-slate-400">{description}</p>
      )}
    </div>
  );
}

function validateImage(file) {
  const supportedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!supportedTypes.includes(file.type)) {
    return `${file.name} is not supported. Choose a JPG, PNG or WebP image.`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `${file.name} exceeds the 5 MB file-size limit.`;
  }

  return "";
}

function extractLocationResults(results) {
  if (!Array.isArray(results)) return [];

  return results
    .filter((result) => {
      const latitude = Number(result.lat ?? result.latitude);
      const longitude = Number(result.lon ?? result.lng ?? result.longitude);

      return (
        Number.isFinite(latitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        Number.isFinite(longitude) &&
        longitude >= -180 &&
        longitude <= 180
      );
    })
    .map((result) => ({
      ...result,
      lat: Number(result.lat ?? result.latitude),
      lon: Number(result.lon ?? result.lng ?? result.longitude),
      display_name:
        result.display_name ||
        result.formatted ||
        (typeof result.address === "string" ? result.address : "") ||
        result.name ||
        result.address?.road ||
        "Location result",
    }));
}

export default function NewDestinationPage() {
  const router = useRouter();

  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const searchSequence = useRef(0);

  const [form, setForm] = useState(INITIAL_FORM);
  const [searchQuery, setSearchQuery] = useState("");

  const [coverFile, setCoverFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);

  const [coverPreview, setCoverPreview] = useState("");
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);

  const [locationMessage, setLocationMessage] = useState("");
  const [imageError, setImageError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
    const { name, value, checked, type } = event.target;

    if (name === "name") {
      setSearchQuery(value);
    }

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
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
    const errors = [];

    for (const file of files) {
      const validationError = validateImage(file);

      if (validationError) {
        errors.push(validationError);
      } else {
        validFiles.push(file);
      }
    }

    setGalleryFiles((previous) => {
      const next = [...previous];

      for (const file of validFiles) {
        const duplicate = next.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified,
        );

        if (!duplicate) next.push(file);
      }

      return next;
    });

    if (errors.length) {
      setImageError(errors.join(" "));
    }
  }

  function removeGalleryImage(index) {
    setGalleryFiles((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  async function searchLocationNow() {
    const name = searchQuery.trim();

    if (name.length < 2) {
      setLocationMessage("Enter at least 2 characters to search.");
      setShowSuggestions(true);
      return;
    }

    const sequence = ++searchSequence.current;

    setSearching(true);
    setShowSuggestions(true);
    setLocationMessage("");
    setSuggestions([]);

    try {
      // Use the dedicated admin location lookup. The backend queries Google
      // first and calls OpenStreetMap only when Google has no usable results.
      const params = new URLSearchParams({
        q: name,
        provider: "google",
        purpose: "location",
        limit: "8",
      });

      const response = await apiRequest(
        `destinations/search/places?${params.toString()}`,
      );

      if (sequence !== searchSequence.current) return;

      const results =
        response?.data?.places ||
        response?.data?.externalPlaces ||
        response?.places ||
        response?.externalPlaces ||
        [];

      const normalize = (value) =>
        String(value || "")
          .toLowerCase()
          .replace(/['’]s\b/g, "")
          .replace(/[^a-z0-9]+/g, " ")
          .trim()
          .split(/\s+/)
          .filter(Boolean);

      const ignoredQueryWords = new Set(["of", "the", "and", "in", "at"]);
      const queryWords = normalize(name).filter(
        (word) => !ignoredQueryWords.has(word),
      );
      const candidates = extractLocationResults(results);

      const matchingResults = candidates
        .map((result) => {
          const resultName =
            result.name || result.display_name?.split(",")[0] || "";
          const resultAddress =
            typeof result.address === "string"
              ? result.address
              : result.display_name;
          const resultWords = normalize(`${resultName} ${resultAddress || ""}`);
          const matchingWords = queryWords.filter((word) =>
            resultWords.includes(word),
          );
          const queryCoverage =
            queryWords.length > 0
              ? matchingWords.length / queryWords.length
              : 0;
          const resultCoverage =
            resultWords.length > 0
              ? matchingWords.length / resultWords.length
              : 0;

          return {
            ...result,
            name: resultName || result.display_name.split(",")[0],
            matchScore: queryCoverage * 0.75 + resultCoverage * 0.25,
            queryCoverage,
          };
        })
        .filter(
          (result) =>
            result.queryCoverage >= (queryWords.length === 1 ? 1 : 0.6),
        )
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 8)
        .map(({ matchScore, queryCoverage, ...result }) => result);

      if (sequence !== searchSequence.current) return;

      setSuggestions(matchingResults);

      setLocationMessage(
        matchingResults.length > 0
          ? `Choose the matching location. Results supplied by ${response?.source || "the location provider"}. Selecting it updates the address and map coordinates without changing your destination name.`
          : "No matching location was found. Check the spelling or try the destination's commonly used name. You can also set its position directly on the map.",
      );
    } catch (err) {
      if (sequence === searchSequence.current) {
        setSuggestions([]);
        setLocationMessage(
          err?.message ||
            "Location search failed. Check your internet connection and try again.",
        );
      }
    } finally {
      if (sequence === searchSequence.current) {
        setSearching(false);
      }
    }
  }

  function chooseLocation(result) {
    const latitude = Number(result.lat ?? result.latitude);
    const longitude = Number(result.lon ?? result.lng ?? result.longitude);

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setLocationMessage(
        "The selected result has invalid coordinates. Please choose another result.",
      );
      return;
    }

    const address =
      result.address && typeof result.address === "object"
        ? result.address
        : {};

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.hamlet ||
      form.city;

    const lga =
      address.county ||
      address.city_district ||
      address.state_district ||
      address.municipality ||
      form.lga;

    setForm((previous) => ({
      ...previous,
      address:
        result.display_name ||
        (typeof result.address === "string" ? result.address : "") ||
        previous.address,
      city,
      lga,
      state: address.state || previous.state,
      latitude: String(latitude),
      longitude: String(longitude),
    }));

    setSuggestions([]);
    setShowSuggestions(false);

    setLocationMessage(
      "Location selected. Confirm the address and coordinates before saving.",
    );
  }

  function handleMapLocationSelect({ latitude, longitude }) {
    const selectedLatitude = Number(latitude);
    const selectedLongitude = Number(longitude);

    if (
      !Number.isFinite(selectedLatitude) ||
      selectedLatitude < -90 ||
      selectedLatitude > 90 ||
      !Number.isFinite(selectedLongitude) ||
      selectedLongitude < -180 ||
      selectedLongitude > 180
    ) {
      setLocationMessage(
        "The map returned invalid coordinates. Please select another location.",
      );
      return;
    }

    setForm((previous) => ({
      ...previous,
      latitude: String(selectedLatitude),
      longitude: String(selectedLongitude),
    }));

    setLocationMessage(
      "Map location selected. The latitude and longitude fields have been updated. Confirm the address before saving.",
    );
  }

  function validateForm() {
    if (!form.name.trim()) {
      return "Enter a destination name.";
    }

    if (!form.shortDescription.trim()) {
      return "Enter a short description.";
    }

    if (!form.category) {
      return "Choose a category.";
    }

    if (form.category === "other" && !form.categoryLabel.trim()) {
      return "Enter the custom category name.";
    }

    if (!form.address.trim()) {
      return "Enter an address or select a search result.";
    }

    if (!form.city.trim()) {
      return "Enter the city or town.";
    }

    if (!form.state.trim()) {
      return "Enter the state.";
    }

    if (
      (form.latitude.trim() && !form.longitude.trim()) ||
      (!form.latitude.trim() && form.longitude.trim())
    ) {
      return "Enter both latitude and longitude.";
    }

    if (
      form.latitude.trim() &&
      (!Number.isFinite(Number(form.latitude)) ||
        Number(form.latitude) < -90 ||
        Number(form.latitude) > 90)
    ) {
      return "Enter a valid latitude between -90 and 90.";
    }

    if (
      form.longitude.trim() &&
      (!Number.isFinite(Number(form.longitude)) ||
        Number(form.longitude) < -180 ||
        Number(form.longitude) > 180)
    ) {
      return "Enter a valid longitude between -180 and 180.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setImageError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const body = new FormData();

      body.append("name", form.name.trim());
      body.append("shortDescription", form.shortDescription.trim());
      body.append("category", form.category);
      body.append("categoryLabel", form.categoryLabel.trim());
      body.append("address", form.address.trim());
      body.append("city", form.city.trim());
      body.append("lga", form.lga.trim());
      body.append("state", form.state.trim());
      body.append("contactPhone", form.contactPhone.trim());
      body.append("website", form.website.trim());
      body.append("priceLevel", form.priceLevel);
      body.append("isPublished", String(form.isPublished));

      if (form.latitude.trim() && form.longitude.trim()) {
        body.append("latitude", String(Number(form.latitude)));
        body.append("longitude", String(Number(form.longitude)));
      }

      if (coverFile) {
        body.append("coverImage", coverFile);
      }

      galleryFiles.forEach((file) => {
        body.append("images", file);
      });

      await apiRequest("destinations", {
        method: "POST",
        body,
      });

      router.push("/admin/destinations");
      router.refresh();
    } catch (err) {
      setError(err?.message || "Could not create the destination.");
    } finally {
      setSaving(false);
    }
  }

  const hasCoordinates =
    form.latitude.trim() !== "" && form.longitude.trim() !== "";

  const selectedCategory =
    CATEGORIES.find((item) => item.value === form.category)?.label ||
    form.categoryLabel ||
    "Destination";

  const mapImagePreview = coverPreview || galleryPreviews[0]?.url || "";

  return (
    <main className="mx-auto max-w-[1120px] space-y-6 pb-8">
      <div>
        <Link
          href="/admin/destinations"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#53715C] hover:text-[#103C2A]"
        >
          <ArrowLeft size={15} />
          Back to destinations
        </Link>

        <div className="mt-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#DCE9D7] bg-[#EEF5EA] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-[#176B48]">
            <MapPin size={13} />
            Destination management
          </span>

          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#103C2A] sm:text-3xl">
            Add destination
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Add a destination to Kaduna Explorer with its location and
            photographs.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <p className="flex-1">{error}</p>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {imageError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>{imageError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSection
          icon={MapPin}
          title="Basic information"
          description="Enter the destination details visitors will see."
        >
          <TextField
            label="Destination name"
            name="name"
            value={form.name}
            onChange={updateField}
            required
            maxLength={150}
            placeholder="e.g. Kajuru Castle"
          />

          <div>
            <FieldLabel htmlFor="shortDescription" required>
              Short description
            </FieldLabel>

            <textarea
              id="shortDescription"
              name="shortDescription"
              value={form.shortDescription}
              onChange={updateField}
              rows={2}
              maxLength={250}
              required
              placeholder="A brief summary displayed on destination cards."
              className={`${inputClass} resize-y`}
            />

            <p className="mt-1 text-right text-[10px] text-slate-400">
              {form.shortDescription.length}/250
            </p>
          </div>

          <SelectField
            label="Category"
            name="category"
            value={form.category}
            onChange={updateField}
            options={CATEGORIES}
            required
          />

          {form.category === "other" && (
            <TextField
              label="Custom category name"
              name="categoryLabel"
              value={form.categoryLabel}
              onChange={updateField}
              required
              placeholder="Enter the category name"
            />
          )}
        </FormSection>

        <FormSection
          icon={MapPinned}
          title="Location details"
          description="Search for a destination or landmark, select the correct result, and confirm its position on the interactive map."
        >
          <div className="relative">
            <FieldLabel htmlFor="locationSearch">
              Search for a destination or landmark
            </FieldLabel>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="locationSearch"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setShowSuggestions(false);
                    setSuggestions([]);
                    setLocationMessage("");
                  }}
                  onFocus={() => {
                    if (suggestions.length) {
                      setShowSuggestions(true);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      searchLocationNow();
                    }

                    if (event.key === "Escape") {
                      setShowSuggestions(false);
                    }
                  }}
                  autoComplete="off"
                  placeholder="Type a destination or landmark..."
                  className={`${inputClass} pl-10 pr-10`}
                />
              </div>

              <button
                type="button"
                onClick={searchLocationNow}
                disabled={searching || searchQuery.trim().length < 2}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FFBD4A] px-4 py-3 text-xs font-extrabold text-[#103C2A] shadow-sm transition hover:bg-[#F3AC2F] focus:outline-none focus:ring-4 focus:ring-[#FFBD4A]/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {searching ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Search size={15} />
                )}

                {searching ? "Searching..." : "Search location"}
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-[#DDE5D8] bg-white p-1.5 shadow-xl">
                {suggestions.map((result, index) => (
                  <button
                    key={`${result.place_id || result.osm_id || result.lat}-${index}`}
                    type="button"
                    onClick={() => chooseLocation(result)}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[#F0F6ED]"
                  >
                    <MapPin
                      size={16}
                      className="mt-0.5 shrink-0 text-[#176B48]"
                    />

                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-[#18352A]">
                        {result.name ||
                          result.display_name?.split(",")[0] ||
                          "Location result"}
                      </span>

                      <span className="mt-1 block text-[11px] leading-5 text-slate-500">
                        {result.display_name}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {showSuggestions &&
              !searching &&
              suggestions.length === 0 &&
              locationMessage && (
                <div className="absolute z-30 mt-2 w-full rounded-xl border border-[#DDE5D8] bg-white p-3 shadow-lg">
                  <p className="text-xs leading-5 text-slate-500">
                    {locationMessage}
                  </p>
                </div>
              )}

            {locationMessage && (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {locationMessage}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField
              label="Address"
              name="address"
              value={form.address}
              onChange={updateField}
              required
              placeholder="Street, area or landmark"
            />

            <TextField
              label="City or town"
              name="city"
              value={form.city}
              onChange={updateField}
              required
              placeholder="City or town"
            />

            <TextField
              label="Local government area"
              name="lga"
              value={form.lga}
              onChange={updateField}
              placeholder="LGA"
            />

            <TextField
              label="State"
              name="state"
              value={form.state}
              onChange={updateField}
              required
              placeholder="Kaduna"
            />

            <TextField
              label="Latitude"
              name="latitude"
              value={form.latitude}
              onChange={updateField}
              type="number"
              step="any"
              placeholder="Latitude"
            />

            <TextField
              label="Longitude"
              name="longitude"
              value={form.longitude}
              onChange={updateField}
              type="number"
              step="any"
              placeholder="Longitude"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E1E7DD]">
            <div className="flex items-center justify-between gap-3 border-b border-[#E1E7DD] bg-[#F8FAF6] px-4 py-3">
              <div>
                <p className="text-xs font-extrabold text-[#103C2A]">
                  Interactive map preview
                </p>

                <p className="mt-1 text-[10px] text-slate-500">
                  {hasCoordinates
                    ? `${form.latitude}, ${form.longitude}`
                    : "Choose a location or enter coordinates."}
                </p>
              </div>

              <MapPinned size={18} className="shrink-0 text-[#176B48]" />
            </div>

            <DestinationMap
              latitude={form.latitude}
              longitude={form.longitude}
              name={form.name || "Selected destination"}
              address={form.address}
              category={selectedCategory}
              imageUrl={mapImagePreview}
              height={420}
              zoom={19}
              onLocationSelect={handleMapLocationSelect}
            />

            {hasCoordinates && (
              <div className="border-t border-[#E1E7DD] bg-white px-4 py-3">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(form.latitude)}&mlon=${encodeURIComponent(form.longitude)}#map=15/${encodeURIComponent(form.latitude)}/${encodeURIComponent(form.longitude)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-[#176B48] hover:underline"
                >
                  Open full map
                </a>
              </div>
            )}
          </div>
        </FormSection>

        <FormSection
          icon={MapPin}
          title="Contact and pricing"
          description="Optional information to help visitors plan their trip."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField
              label="Contact phone"
              name="contactPhone"
              value={form.contactPhone}
              onChange={updateField}
              type="tel"
              placeholder="Phone number"
            />

            <TextField
              label="Website"
              name="website"
              value={form.website}
              onChange={updateField}
              type="url"
              placeholder="https://example.com"
            />
          </div>

          <SelectField
            label="Price level"
            name="priceLevel"
            value={form.priceLevel}
            onChange={updateField}
            options={PRICE_LEVELS}
          />
        </FormSection>

        <FormSection
          icon={ImagePlus}
          title="Cover image"
          description="The main photograph used on destination cards and detail pages."
        >
          <ImageUploadBox
            title="Upload a cover image"
            description="JPG, PNG or WebP. Maximum 5 MB. This is separate from the gallery."
            inputRef={coverInputRef}
            onChange={handleCoverChange}
            preview={coverPreview}
            fileName={coverFile?.name || ""}
            onRemove={() => setCoverFile(null)}
          />
        </FormSection>

        <FormSection
          icon={Images}
          title="Gallery images"
          description="Add as many additional photographs as you need, subject to your backend and storage provider limits."
        >
          <ImageUploadBox
            title="Upload gallery photos"
            description="Select multiple JPG, PNG or WebP images. Each image must be 5 MB or smaller."
            inputRef={galleryInputRef}
            onChange={handleGalleryChange}
            multiple
          />

          {galleryPreviews.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-[#294638]">
                  Selected gallery images
                </p>

                <p className="text-[10px] text-slate-400">
                  {galleryPreviews.length} selected
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {galleryPreviews.map(({ file, url }, index) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="overflow-hidden rounded-xl border border-[#E1E7DD] bg-white p-2"
                  >
                    <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg bg-[#F5F7F2]">
                      <img
                        src={url}
                        alt={file.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="truncate text-[10px] font-semibold text-[#294638]">
                        {file.name}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index)}
                        aria-label={`Remove ${file.name}`}
                        className="shrink-0 rounded-lg p-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </FormSection>

        <FormSection
          icon={Eye}
          title="Publication"
          description="Choose whether this destination should appear on the public website."
        >
          <label className="flex items-start gap-3 rounded-xl border border-[#E1E7DD] bg-[#F9FBF7] p-4">
            <input
              type="checkbox"
              name="isPublished"
              checked={form.isPublished}
              onChange={updateField}
              className="mt-1 h-4 w-4 accent-[#176B48]"
            />

            <span>
              <span className="flex items-center gap-2 text-xs font-bold text-[#294638]">
                {form.isPublished ? <Eye size={15} /> : <EyeOff size={15} />}
                Publish destination immediately
              </span>

              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {form.isPublished
                  ? "This destination will be available on the public website after saving."
                  : "Save this destination as a draft and publish it later."}
              </span>
            </span>
          </label>
        </FormSection>

        <div className="sticky bottom-3 z-20 flex flex-col-reverse justify-between gap-3 rounded-2xl border border-[#E1E7DD] bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row">
          <Link
            href="/admin/destinations"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DFE6DC] px-4 py-3 text-xs font-bold text-[#294638] hover:bg-[#F8FAF6]"
          >
            <ArrowLeft size={15} />
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#103C2A] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#176B48] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}

            {saving
              ? "Saving destination..."
              : form.isPublished
                ? "Create and publish"
                : "Save as draft"}
          </button>
        </div>
      </form>
    </main>
  );
}
