"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
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

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const CATEGORIES = [
  ["attraction", "Tourist attraction"],
  ["restaurant", "Restaurant"],
  ["hotel", "Hotel"],
  ["cafe", "Cafe"],
  ["park", "Park and garden"],
  ["nature", "Nature and wildlife"],
  ["culture", "Culture and heritage"],
  ["historical-site", "Historical site"],
  ["shopping", "Shopping centre and mall"],
  ["market", "Market and local shopping"],
  ["entertainment", "Entertainment"],
  ["sports", "Sports and recreation"],
  ["event", "Event and festival"],
  ["nightlife", "Nightlife"],
  ["hospital", "Hospital"],
  ["clinic", "Clinic and medical centre"],
  ["pharmacy", "Pharmacy"],
  ["school", "School and educational institution"],
  ["university", "University and college"],
  ["religious-site", "Religious site"],
  ["mosque", "Mosque"],
  ["church", "Church"],
  ["government-office", "Government office"],
  ["police-station", "Police station"],
  ["bank", "Bank and ATM"],
  ["transport", "Transport terminal"],
  ["airport", "Airport"],
  ["hotel-service", "Guest house and accommodation"],
  ["fuel-station", "Fuel station"],
  ["conference-centre", "Conference and event centre"],
  ["museum", "Museum and gallery"],
  ["library", "Library"],
  ["farm", "Farm and agricultural tourism"],
  ["waterfall", "Waterfall and water attraction"],
  ["viewpoint", "Scenic viewpoint"],
  ["service", "Other service"],
  ["other", "Other"],
];

const PRICE_LEVELS = [
  ["unknown", "Not specified"],
  ["free", "Free"],
  ["budget", "Budget friendly"],
  ["moderate", "Moderate"],
  ["expensive", "Premium"],
];

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

function Section({ icon: Icon, title, description, children }) {
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

function TextField({
  label,
  name,
  value,
  onChange,
  required = false,
  placeholder = "",
  type = "text",
  ...props
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
        value={value ?? ""}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={inputClass}
        {...props}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          className={`${inputClass} appearance-none pr-10`}
        >
          {options.map((option) => {
            const item = Array.isArray(option)
              ? { value: option[0], label: option[1] }
              : option;

            return (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            );
          })}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
      </div>
    </div>
  );
}

function validateImage(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return `${file.name}: only JPG, PNG and WebP images are supported.`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `${file.name}: each image must be 5 MB or smaller.`;
  }

  return "";
}

function getImageUrl(image) {
  if (typeof image === "string") return image;
  return image?.url || image?.secure_url || "";
}

function getImagePublicId(image) {
  if (typeof image === "string") return "";
  return image?.publicId || image?.public_id || "";
}

function getCoverUrl(cover) {
  if (typeof cover === "string") return cover;
  return cover?.url || cover?.secure_url || "";
}

function extractDestination(response) {
  return (
    response?.data?.destination ||
    response?.data?.data?.destination ||
    response?.destination ||
    response?.data?.data ||
    response?.data ||
    response
  );
}

function getCoordinate(destination, index) {
  const coordinates = destination?.location?.coordinates;

  if (Array.isArray(coordinates)) {
    return index === 0 ? coordinates[1] : coordinates[0];
  }

  return "";
}

function getGoogleMapEmbedUrl(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return "";
  }

  return `https://maps.google.com/maps?q=${encodeURIComponent(
    `${lat},${lon}`,
  )}&z=16&output=embed`;
}

function getOpenStreetMapEmbedUrl(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return "";
  }

  const delta = 0.015;

  const params = new URLSearchParams({
    bbox: `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`,
    layer: "mapnik",
    marker: `${lat},${lon}`,
  });

  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}

function getGoogleMapsUrl(latitude, longitude) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${latitude},${longitude}`,
  )}`;
}

export default function EditDestinationPage() {
  const params = useParams();
  const router = useRouter();

  const destinationId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const searchSequence = useRef(0);

  const [destination, setDestination] = useState(null);
  const [form, setForm] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newCover, setNewCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [imageError, setImageError] = useState("");
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeMapProvider, setActiveMapProvider] = useState("google");

  const loadDestination = useCallback(async () => {
    if (!destinationId) return;

    setLoading(true);
    setPageError("");

    try {
      const response = await apiRequest("destinations/admin");

      const destinations =
        response?.data?.destinations ||
        response?.data?.data?.destinations ||
        response?.destinations ||
        response?.data ||
        [];

      const item = Array.isArray(destinations)
        ? destinations.find(
            (record) =>
              String(record._id || record.id) === String(destinationId),
          )
        : extractDestination(response);

      if (!item || !(item._id || item.id || item.name)) {
        throw new Error("The backend did not return a valid destination.");
      }

      setDestination(item);
      setSearchQuery(item.name || "");

      const coverUrl = getCoverUrl(item.coverImage);
      const gallery = Array.isArray(item.images) ? item.images : [];

      setExistingImages(
        gallery
          .map((image, index) => ({
            key:
              getImagePublicId(image) ||
              getImageUrl(image) ||
              `existing-image-${index}`,
            url: getImageUrl(image),
            publicId: getImagePublicId(image),
            alt: image?.alt || "",
          }))
          .filter((image) => image.url),
      );

      setRemovedImageIds([]);

      setForm({
        name: item.name || "",
        shortDescription: item.shortDescription || "",
        category: item.category || "attraction",
        categoryLabel: item.categoryLabel || "",
        address: item.address || "",
        city: item.city || "",
        lga: item.lga || "",
        state: item.state || "Kaduna",
        contactPhone: item.contactPhone || "",
        website: item.website || "",
        priceLevel: item.priceLevel || "unknown",
        latitude: String(getCoordinate(item, 0) ?? ""),
        longitude: String(getCoordinate(item, 1) ?? ""),
        isPublished: Boolean(item.isPublished),
      });

      setNewImages([]);
      setNewCover(null);
      setCoverPreview(coverUrl);
      setSuggestions([]);
      setShowSuggestions(false);
      setLocationMessage("");
    } catch (err) {
      setPageError(err?.message || "Could not load this destination.");
    } finally {
      setLoading(false);
    }
  }, [destinationId]);

  useEffect(() => {
    loadDestination();
  }, [loadDestination]);

  useEffect(() => {
    if (!newCover) return undefined;

    const url = URL.createObjectURL(newCover);
    setCoverPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [newCover]);

  useEffect(() => {
    const previews = newImages.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setGalleryPreviews(previews);

    return () => {
      previews.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [newImages]);

  function updateField(event) {
    const { name, value, checked, type } = event.target;

    if (name === "name") {
      setSearchQuery(value);
    }

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    setNotice("");
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

    setNewCover(file);
  }

  function handleGalleryChange(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    setImageError("");

    const valid = [];
    const errors = [];

    for (const file of files) {
      const message = validateImage(file);

      if (message) errors.push(message);
      else valid.push(file);
    }

    setNewImages((current) => {
      const next = [...current];

      for (const file of valid) {
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

    if (errors.length) setImageError(errors.join(" "));
  }

  function removeExistingImage(image) {
    setExistingImages((current) =>
      current.filter((item) => item.key !== image.key),
    );

    if (image.publicId) {
      setRemovedImageIds((current) =>
        current.includes(image.publicId)
          ? current
          : [...current, image.publicId],
      );
    } else {
      setNotice(
        "This image has no stored public ID. The backend must support removal by URL for it to be deleted from storage.",
      );
    }
  }

  function removeNewImage(index) {
    setNewImages((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  async function searchLocationNow() {
    const name = searchQuery.trim();

    if (!name || name.length < 2) {
      setLocationMessage("Enter a destination name before searching.");
      return;
    }

    const sequence = ++searchSequence.current;

    setSearching(true);
    setShowSuggestions(true);
    setSuggestions([]);
    setLocationMessage("");

    try {
      // Use the same dedicated admin lookup as the create form:
      // Google first, then OSM only if Google has no usable matching result.
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

      // Support both apiRequest return shapes: parsed API JSON and
      // Axios-style { data: API_JSON } wrappers.
      const responseBody = response?.data?.data ?? response?.data ?? response;
      const results = Array.isArray(responseBody?.places)
        ? responseBody.places
        : Array.isArray(responseBody?.externalPlaces)
          ? responseBody.externalPlaces
          : [];

      const normalize = (value) =>
        String(value || "")
          .toLowerCase()
          .replace(/[’']/g, "")
          .replace(/[^a-z0-9]+/g, " ")
          .trim()
          .split(/\s+/)
          .filter(Boolean);

      const ignoredQueryWords = new Set(["of", "the", "and", "in", "at"]);
      const queryWords = normalize(name).filter(
        (word) => !ignoredQueryWords.has(word),
      );
      const matchingResults = results
        .map((result) => {
          const latitude = Number(
            result.lat ?? result.latitude ?? result.location?.latitude,
          );
          const longitude = Number(
            result.lon ??
              result.lng ??
              result.longitude ??
              result.location?.longitude,
          );

          if (
            !Number.isFinite(latitude) ||
            latitude < -90 ||
            latitude > 90 ||
            !Number.isFinite(longitude) ||
            longitude < -180 ||
            longitude > 180
          ) {
            return null;
          }

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
          const queryCoverage = queryWords.length
            ? matchingWords.length / queryWords.length
            : 0;
          const resultCoverage = resultWords.length
            ? matchingWords.length / resultWords.length
            : 0;

          return {
            ...result,
            lat: latitude,
            lon: longitude,
            name: resultName,
            display_name:
              result.display_name ||
              (typeof result.address === "string" ? result.address : "") ||
              resultName,
            matchScore: queryCoverage * 0.75 + resultCoverage * 0.25,
            queryCoverage,
          };
        })
        .filter(Boolean)
        // Do not show unrelated places simply because they are in Kaduna.
        .filter(
          (result) =>
            result.queryCoverage >= (queryWords.length === 1 ? 1 : 0.6),
        )
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 8)
        .map(({ matchScore, queryCoverage, ...result }) => result);

      if (sequence !== searchSequence.current) return;

      setSuggestions(matchingResults);
      setShowSuggestions(matchingResults.length > 0);
      setLocationMessage(
        matchingResults.length > 0
          ? `Choose the matching location. Results supplied by ${responseBody?.source || response?.source || "the location provider"}. Selecting a result updates the address and map coordinates, not your destination name.`
          : "No matching location was found. Try another spelling or the destination's commonly used name. You can also enter coordinates manually.",
      );
    } catch (err) {
      if (sequence === searchSequence.current) {
        setSuggestions([]);
        setShowSuggestions(false);
        setLocationMessage(
          err?.message ||
            "Location search could not connect to the Kaduna Explorer API. Check that the backend is running and try again.",
        );
      }
    } finally {
      if (sequence === searchSequence.current) {
        setSearching(false);
      }
    }
  }

  function chooseLocation(result) {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setLocationMessage("The selected result has invalid coordinates.");
      return;
    }

    const address = result.address || {};

    setForm((current) => ({
      ...current,
      address: result.display_name || current.address,
      city:
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        current.city,
      lga:
        address.county ||
        address.city_district ||
        address.state_district ||
        current.lga,
      state: address.state || current.state,
      latitude: String(latitude),
      longitude: String(longitude),
    }));

    setSuggestions([]);
    setShowSuggestions(false);
    setLocationMessage(
      "Location selected. The embedded map will update to the selected coordinates.",
    );
    setNotice("");
  }

  function validateForm() {
    if (!form.name.trim()) return "Destination name is required.";

    if (!form.shortDescription.trim()) {
      return "Short description is required.";
    }

    if (!form.address.trim()) return "Address is required.";
    if (!form.city.trim()) return "City or town is required.";
    if (!form.state.trim()) return "State is required.";

    if (form.category === "other" && !form.categoryLabel.trim()) {
      return "Enter a name for the Other category.";
    }

    if (Boolean(form.latitude.trim()) !== Boolean(form.longitude.trim())) {
      return "Enter both latitude and longitude, or leave both empty.";
    }

    if (form.latitude.trim() && form.longitude.trim()) {
      const latitude = Number(form.latitude);
      const longitude = Number(form.longitude);

      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        return "Latitude must be between -90 and 90.";
      }

      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return "Longitude must be between -180 and 180.";
      }
    }

    if (form.website.trim()) {
      try {
        const website = new URL(form.website.trim());

        if (!["http:", "https:"].includes(website.protocol)) {
          return "Website must start with http:// or https://.";
        }
      } catch {
        return "Enter a valid website URL.";
      }
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setPageError("");
    setNotice("");

    const validationError = validateForm();

    if (validationError) {
      setPageError(validationError);
      return;
    }

    setSaving(true);

    try {
      const body = new FormData();

      body.append("name", form.name.trim());
      body.append("shortDescription", form.shortDescription.trim());
      body.append("category", form.category);
      body.append(
        "categoryLabel",
        form.category === "other" ? form.categoryLabel.trim() : "",
      );
      body.append("address", form.address.trim());
      body.append("city", form.city.trim());
      body.append("lga", form.lga.trim());
      body.append("state", form.state.trim() || "Kaduna");
      body.append("contactPhone", form.contactPhone.trim());
      body.append("website", form.website.trim());
      body.append("priceLevel", form.priceLevel || "unknown");
      body.append("isPublished", String(Boolean(form.isPublished)));
      body.append(
        "retainedImagePublicIds",
        JSON.stringify(
          existingImages.map((image) => image.publicId).filter(Boolean),
        ),
      );
      body.append(
        "retainedImageUrls",
        JSON.stringify(existingImages.map((image) => image.url)),
      );
      body.append("removeImagePublicIds", JSON.stringify(removedImageIds));

      if (form.latitude.trim() && form.longitude.trim()) {
        body.append("latitude", String(Number(form.latitude)));
        body.append("longitude", String(Number(form.longitude)));
      }

      if (newCover) body.append("coverImage", newCover);

      // Preserve the gallery without imposing a fixed image-count limit.
      newImages.forEach((file) => body.append("images", file));

      await apiRequest(`destinations/${encodeURIComponent(destinationId)}`, {
        method: "PATCH",
        body,
      });

      // Drafts may not appear in the public endpoint. Redirect directly
      // after the successful update instead of reloading the edit page.
      if (!form.isPublished) {
        router.replace("/admin/destinations");
        router.refresh();
        return;
      }

      setNotice("Destination updated successfully.");
      setPageError("");

      // A reload failure should not turn a successful save into an error.
      try {
        await loadDestination();
      } catch {
        // Keep the success notice visible.
      }

      router.refresh();
    } catch (err) {
      setPageError(err?.message || "Could not update this destination.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-semibold text-[#53715C]">
          <LoaderCircle size={20} className="animate-spin" />
          Loading destination...
        </div>
      </div>
    );
  }

  if (!form || !destination) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-6">
        <AlertCircle className="text-red-600" size={22} />
        <h1 className="mt-3 text-lg font-extrabold text-[#103C2A]">
          Destination could not be loaded
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {pageError ||
            "The requested destination was not returned by the API."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadDestination}
            className="rounded-xl bg-[#103C2A] px-4 py-3 text-xs font-bold text-white"
          >
            Try again
          </button>
          <Link
            href="/admin/destinations"
            className="rounded-xl border border-[#DFE6DC] px-4 py-3 text-xs font-bold text-[#294638]"
          >
            Back to destinations
          </Link>
        </div>
      </div>
    );
  }

  const hasCoordinates =
    form.latitude.trim() !== "" &&
    form.longitude.trim() !== "" &&
    Number.isFinite(Number(form.latitude)) &&
    Number.isFinite(Number(form.longitude));

  const mapUrl =
    hasCoordinates && activeMapProvider === "google"
      ? getGoogleMapEmbedUrl(form.latitude, form.longitude)
      : hasCoordinates
        ? getOpenStreetMapEmbedUrl(form.latitude, form.longitude)
        : "";

  const googleMapsUrl = hasCoordinates
    ? getGoogleMapsUrl(form.latitude, form.longitude)
    : "";

  return (
    <main className="mx-auto w-full max-w-[1120px] space-y-4 px-3 pb-6 text-[13px] sm:space-y-5 sm:px-5 sm:pb-8 sm:text-sm lg:px-6">
      <div>
        <Link
          href="/admin/destinations"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#53715C] hover:text-[#103C2A] sm:text-xs"
        >
          <ArrowLeft size={14} />
          Back to destinations
        </Link>
        <div className="mt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE9D7] bg-[#EEF5EA] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#176B48] sm:px-3 sm:text-[10px]">
            <MapPin size={12} />
            Destination management
          </span>
          <h1 className="mt-2 text-xl font-extrabold tracking-tight text-[#103C2A] sm:text-2xl lg:text-3xl">
            Edit destination
          </h1>
          <p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-slate-500 sm:text-xs sm:leading-6">
            Update destination details, location, photographs and publication
            status.
          </p>
        </div>
      </div>

      {pageError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 sm:p-4 sm:text-sm"
        >
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0 sm:h-[18px] sm:w-[18px]"
          />
          <p className="flex-1">{pageError}</p>
          <button
            type="button"
            onClick={() => setPageError("")}
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#D5E8D0] bg-[#F0F7EC] p-3 text-xs text-[#176B48] sm:p-4 sm:text-sm">
          <CheckCircle2
            size={16}
            className="mt-0.5 shrink-0 sm:h-[18px] sm:w-[18px]"
          />
          <p>{notice}</p>
        </div>
      )}

      {imageError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900 sm:text-xs">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <p>{imageError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <Section
          icon={MapPin}
          title="Basic information"
          description="Update the destination name, category and short description."
        >
          <TextField
            label="Destination name"
            name="name"
            value={form.name}
            onChange={updateField}
            required
            maxLength={150}
            placeholder="Destination name"
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
              rows={3}
              maxLength={250}
              required
              className={`${inputClass} resize-y text-xs sm:text-sm`}
              placeholder="Short summary for destination cards"
            />
            <p className="mt-1 text-right text-[9px] text-slate-400 sm:text-[10px]">
              {form.shortDescription.length}/250
            </p>
          </div>
          <SelectField
            label="Category"
            name="category"
            value={form.category}
            onChange={updateField}
            options={CATEGORIES}
          />
          {form.category === "other" && (
            <TextField
              label="Custom category name"
              name="categoryLabel"
              value={form.categoryLabel}
              onChange={updateField}
              required
              placeholder="Enter category name"
            />
          )}
        </Section>

        <Section
          icon={MapPinned}
          title="Location details"
          description="Search for a destination, select a result and view its location on an embedded map."
        >
          <div className="relative">
            <FieldLabel htmlFor="locationSearch">
              Search for a destination or landmark
            </FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                    if (suggestions.length) setShowSuggestions(true);
                  }}
                  autoComplete="off"
                  placeholder="Type a destination name..."
                  className={`${inputClass} py-2.5 pl-9 text-xs sm:py-3 sm:text-sm`}
                />
              </div>
              <button
                type="button"
                onClick={searchLocationNow}
                disabled={searching || searchQuery.trim().length < 2}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FFBD4A] px-3.5 py-2.5 text-[11px] font-extrabold text-[#103C2A] shadow-sm transition hover:bg-[#F3AC2F] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-3 sm:text-xs"
              >
                {searching ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                {searching ? "Searching..." : "Search location"}
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-40 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-[#DDE5D8] bg-white p-1 shadow-xl sm:max-h-72 sm:p-1.5">
                {suggestions.map((result, index) => (
                  <button
                    key={`${result.place_id || result.osm_id || result.lat}-${index}`}
                    type="button"
                    onClick={() => chooseLocation(result)}
                    className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left hover:bg-[#F0F6ED] sm:px-3 sm:py-3"
                  >
                    <MapPin
                      size={14}
                      className="mt-0.5 shrink-0 text-[#176B48]"
                    />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-bold text-[#18352A] sm:text-xs">
                        {result.name ||
                          result.display_name?.split(",")[0] ||
                          "Location result"}
                      </span>
                      <span className="mt-1 block text-[10px] leading-4 text-slate-500 sm:text-[11px] sm:leading-5">
                        {result.display_name}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {locationMessage && (
              <p className="mt-2 text-[10px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
                {locationMessage}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
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

          <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-[#E1E7DD]">
            <div className="flex items-center justify-between gap-2 border-b border-[#E1E7DD] bg-[#F8FAF6] px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold text-[#103C2A] sm:text-xs">
                  Interactive map preview
                </p>
                <p className="mt-1 break-all text-[9px] text-slate-500 sm:text-[10px]">
                  {hasCoordinates
                    ? `${form.latitude}, ${form.longitude}`
                    : "Choose a location or enter coordinates."}
                </p>
              </div>
              <MapPinned size={17} className="shrink-0 text-[#176B48]" />
            </div>

            {hasCoordinates && mapUrl ? (
              <>
                <div className="flex items-center gap-1.5 border-b border-[#E1E7DD] bg-white p-2 sm:gap-2 sm:p-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveMapProvider("google")}
                    aria-pressed={activeMapProvider === "google"}
                    className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-bold transition sm:gap-2 sm:px-3 sm:text-xs ${
                      activeMapProvider === "google"
                        ? "bg-[#103C2A] text-white shadow-sm"
                        : "border border-[#DFE6DC] bg-white text-[#294638] hover:bg-[#F4F7F1]"
                    }`}
                  >
                    <MapPinned size={13} />
                    Google Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMapProvider("osm")}
                    aria-pressed={activeMapProvider === "osm"}
                    className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-bold transition sm:gap-2 sm:px-3 sm:text-xs ${
                      activeMapProvider === "osm"
                        ? "bg-[#103C2A] text-white shadow-sm"
                        : "border border-[#DFE6DC] bg-white text-[#294638] hover:bg-[#F4F7F1]"
                    }`}
                  >
                    <MapPin size={13} />
                    OpenStreetMap
                  </button>
                </div>

                <div className="relative h-[220px] w-full overflow-hidden bg-[#EAF1E9] sm:h-[320px] lg:h-[350px]">
                  <iframe
                    key={`${activeMapProvider}-${form.latitude}-${form.longitude}`}
                    title={`${activeMapProvider === "google" ? "Google Maps" : "OpenStreetMap"} preview for ${form.name || "selected destination"}`}
                    src={mapUrl}
                    className="absolute inset-0 h-full w-full border-0"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  {coverPreview && (
                    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
                      <div className="relative flex flex-col items-center">
                        <div className="h-14 w-14 overflow-hidden rounded-full border-[3px] border-white bg-white shadow-xl ring-2 ring-[#FFBD4A] sm:h-20 sm:w-20">
                          <img
                            src={coverPreview}
                            alt={`${form.name || "Destination"} cover preview`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="-mt-1 h-3 w-3 rotate-45 border-b-4 border-r-4 border-white bg-[#FFBD4A]" />
                      </div>
                    </div>
                  )}
                  <div className="pointer-events-none absolute bottom-2 left-2 z-20 max-w-[75%] rounded-lg border border-white/70 bg-white/95 px-2 py-1.5 shadow-md backdrop-blur sm:bottom-3 sm:left-3 sm:px-3 sm:py-2">
                    <p className="truncate text-[9px] font-extrabold text-[#103C2A] sm:text-[10px]">
                      {form.name || "Selected destination"}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] text-slate-500 sm:text-[10px]">
                      {form.city || form.address || "Selected map location"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-[#E1E7DD] bg-white px-3 py-2 sm:px-4 sm:py-3">
                  <span className="min-w-0 truncate text-[9px] text-slate-500 sm:text-[10px]">
                    Showing{" "}
                    {activeMapProvider === "google"
                      ? "Google Maps"
                      : "OpenStreetMap"}
                  </span>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-[9px] font-bold text-[#176B48] hover:underline sm:text-[10px]"
                  >
                    Open in Google Maps ↗
                  </a>
                </div>
              </>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center bg-[#F8FAF6] px-4 text-center sm:h-48 sm:px-5">
                <MapPin size={23} className="text-[#91A892]" />
                <p className="mt-2 text-[11px] font-bold text-[#294638] sm:mt-3 sm:text-xs">
                  Map location not set
                </p>
                <p className="mt-1 text-[10px] leading-4 text-slate-500 sm:text-[11px] sm:leading-5">
                  Select a matching location above or enter valid coordinates.
                </p>
              </div>
            )}
          </div>
        </Section>

        <Section
          icon={MapPin}
          title="Contact and pricing"
          description="Optional visitor information."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            <TextField
              label="Contact phone"
              name="contactPhone"
              value={form.contactPhone}
              onChange={updateField}
              type="tel"
              placeholder="Contact phone"
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
        </Section>

        <Section
          icon={ImagePlus}
          title="Cover image"
          description="The main photograph used on destination cards and detail pages."
        >
          <div className="rounded-xl border border-dashed border-[#BFD1BA] bg-[#F9FBF7] p-3 sm:p-4">
            {coverPreview ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex min-h-52 w-full items-center justify-center overflow-hidden rounded-lg bg-white p-2 sm:min-h-[360px] sm:p-3">
                  <img
                    src={coverPreview}
                    alt="Destination cover"
                    className="max-h-[280px] w-full object-contain sm:max-h-[440px]"
                  />
                </div>
                <p className="max-w-full truncate text-[10px] font-bold text-[#294638] sm:text-xs">
                  {newCover?.name || "Current cover image"}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9E5D5] bg-white px-3 py-2 text-[10px] font-bold text-[#176B48] hover:bg-[#F1F7EE] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-xs"
                  >
                    <Upload size={13} />
                    Replace cover image
                  </button>
                  {newCover && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewCover(null);
                        setCoverPreview(getCoverUrl(destination.coverImage));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-[10px] font-bold text-red-600 hover:bg-red-50 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-xs"
                    >
                      <X size={13} />
                      Cancel replacement
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F1E4] text-[#176B48]">
                  <ImagePlus size={19} />
                </div>
                <p className="mt-3 text-xs font-extrabold text-[#103C2A] sm:text-sm">
                  Upload a cover image
                </p>
                <p className="mt-1.5 text-[10px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
                  JPG, PNG or WebP. Maximum 5 MB. Separate from the gallery.
                </p>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#D9E5D5] bg-white px-3 py-2 text-[10px] font-bold text-[#176B48] hover:bg-[#F1F7EE] sm:px-4 sm:py-2.5 sm:text-xs"
                >
                  <Upload size={14} />
                  Select cover image
                </button>
              </div>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverChange}
              className="hidden"
            />
          </div>
        </Section>

        <Section
          icon={Images}
          title="Gallery images"
          description="Manage existing photographs and add new images. No fixed gallery count is imposed by this form."
        >
          <div>
            <p className="mb-3 text-[11px] font-bold text-[#294638] sm:text-xs">
              Existing gallery ({existingImages.length})
            </p>
            {existingImages.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {existingImages.map((image) => (
                  <div
                    key={image.key}
                    className="min-w-0 overflow-hidden rounded-xl border border-[#E1E7DD] bg-white p-1.5 sm:p-2"
                  >
                    <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-[#F5F7F2] sm:h-28">
                      <img
                        src={image.url}
                        alt={image.alt || "Destination gallery image"}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExistingImage(image)}
                      className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[9px] font-bold text-red-600 hover:bg-red-50 sm:mt-2 sm:text-[10px]"
                    >
                      <Trash2 size={12} />
                      Remove image
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-[#D9E5D5] bg-[#F9FBF7] p-4 text-center text-[10px] text-slate-500 sm:p-5 sm:text-xs">
                No existing gallery images.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-dashed border-[#BFD1BA] bg-[#F9FBF7] p-3 text-center sm:p-4">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F1E4] text-[#176B48]">
              <Images size={19} />
            </div>
            <p className="mt-3 text-xs font-extrabold text-[#103C2A] sm:text-sm">
              Add gallery photos
            </p>
            <p className="mt-1.5 text-[10px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
              Select multiple JPG, PNG or WebP images. Each image must be 5 MB
              or smaller.
            </p>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#D9E5D5] bg-white px-3 py-2 text-[10px] font-bold text-[#176B48] hover:bg-[#F1F7EE] sm:px-4 sm:py-2.5 sm:text-xs"
            >
              <Upload size={14} />
              Select gallery images
            </button>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleGalleryChange}
              className="hidden"
            />
          </div>

          {galleryPreviews.length > 0 && (
            <div>
              <p className="mb-3 text-[11px] font-bold text-[#294638] sm:text-xs">
                New images ({galleryPreviews.length})
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {galleryPreviews.map(({ file, url }, index) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="overflow-hidden rounded-xl border border-[#E1E7DD] bg-white p-1.5 sm:p-2"
                  >
                    <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-[#F5F7F2] sm:h-28">
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
                        onClick={() => removeNewImage(index)}
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
        </Section>

        <Section
          icon={Eye}
          title="Publication"
          description="Choose whether the destination should appear on the public website."
        >
          <label className="flex items-start gap-3 rounded-xl border border-[#E1E7DD] bg-[#F9FBF7] p-3 sm:p-4">
            <input
              type="checkbox"
              name="isPublished"
              checked={form.isPublished}
              onChange={updateField}
              className="mt-1 h-4 w-4 accent-[#176B48]"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-xs font-extrabold text-[#103C2A]">
                {form.isPublished ? (
                  <Eye size={14} className="text-[#176B48]" />
                ) : (
                  <EyeOff size={14} className="text-slate-400" />
                )}
                Publish destination
              </span>
              <span className="mt-1.5 block text-[11px] leading-5 text-slate-500">
                {form.isPublished
                  ? "This destination will be marked as published when saved."
                  : "Save as a draft and publish it when you are ready."}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                form.isPublished
                  ? "bg-[#E5F5E9] text-[#176B48]"
                  : "bg-[#F0F0EB] text-slate-500"
              }`}
            >
              {form.isPublished ? "Published" : "Draft"}
            </span>
          </label>
        </Section>

        <div className="sticky bottom-3 z-20 rounded-2xl border border-[#E1E6DE] bg-white/95 p-3 shadow-xl shadow-[#103C2A]/[0.08] backdrop-blur-xl sm:p-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/admin/destinations"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E1E6DE] px-4 py-3 text-xs font-bold text-[#53665A] transition hover:bg-[#F7F9F5]"
            >
              <ArrowLeft size={15} />
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#103C2A] px-5 py-3 text-xs font-bold text-white shadow-lg shadow-[#103C2A]/10 transition hover:bg-[#176B48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD4A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  Saving destination...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {form.isPublished ? "Save changes" : "Save as draft"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
