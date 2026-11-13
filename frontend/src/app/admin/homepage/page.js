"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  AlertCircle,
} from "lucide-react";

import { apiRequest } from "@/lib/api";

const EMPTY_IMAGE = () => ({
  url: "",

  publicId: "",

  name: "",

  alt: "",
});

const DEFAULTS = {
  hero: {
    eyebrow: "Discover Kaduna",

    title: "Find your next experience",

    description: "",

    primaryButtonText: "Explore Kaduna",

    image: EMPTY_IMAGE(),
  },

  categories: [],

  about: {
    eyebrow: "About Kaduna Explorer",

    title: "Discover more of Kaduna",

    description: "",

    gallery: [],
  },

  faqs: [],

  sections: [],

  contact: {
    email: "",

    phone: "",

    address: "",

    whatsapp: "",

    instagram: "",

    facebook: "",

    x: "",
  },
};

const TABS = ["categories", "about", "faqs"];

const fieldClass =
  "w-full rounded-xl border border-[#dce7dc] bg-white px-3.5 py-3 text-sm text-[#103c2a] outline-none focus:border-[#176b48] focus:ring-2 focus:ring-[#176b48]/10";

const actionClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dce7dc] bg-white px-3 py-2 text-sm font-semibold text-[#103c2a] hover:bg-[#f1f6f1] disabled:opacity-40";

const primaryClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#103c2a] px-5 py-3 text-sm font-bold text-white hover:bg-[#176b48] disabled:opacity-50";

const slugify = (value) =>
  String(value || "")
    .trim()

    .toLowerCase()

    .replace(/[^a-z0-9]+/g, "-")

    .replace(/^-|-$/g, "");

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const decorate = (data) => ({
  ...DEFAULTS,

  ...data,

  hero: {
    ...DEFAULTS.hero,

    ...(data?.hero || {}),

    image: {
      ...EMPTY_IMAGE(),

      ...(data?.hero?.image || {}),
    },
  },

  about: {
    ...DEFAULTS.about,

    ...(data?.about || {}),

    gallery: (data?.about?.gallery || []).map((image) => ({
      ...EMPTY_IMAGE(),

      ...image,

      _localKey: uid(),
    })),
  },

  categories: (data?.categories || []).map((category) => ({
    ...category,

    image: {
      ...EMPTY_IMAGE(),

      ...(category.image || {}),
    },

    _localKey: uid(),
  })),

  faqs: (data?.faqs || []).map((faq) => ({
    ...faq,

    _localKey: uid(),
  })),

  contact: {
    ...DEFAULTS.contact,

    ...(data?.contact || {}),
  },
});

function Field({
  label,

  value,

  onChange,

  multiline = false,

  placeholder = "",

  type = "text",
}) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="block text-xs font-bold text-[#294638]">{label}</span>

      {multiline ? (
        <textarea
          rows={4}
          className={`${fieldClass} resize-y`}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={fieldClass}
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

function Panel({ title, description, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#e2e9df] bg-white shadow-sm">
      <div className="border-b border-[#edf0eb] p-4 sm:px-6">
        <h2 className="text-base font-extrabold text-[#103c2a]">{title}</h2>

        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        )}
      </div>

      <div className="space-y-5 p-4 sm:p-6">{children}</div>
    </section>
  );
}

function ImageInput({ title, image, pending, onChoose, onRemove, onUndo }) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!pending) {
      setPreview("");

      return;
    }

    const url = URL.createObjectURL(pending);

    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [pending]);

  const src = preview || image?.url || "";

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-[#294638]">{title}</p>

      <div className="relative flex min-h-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#c9d8c7] bg-[#f3f7f1]">
        {src ? (
          <img
            src={src}
            alt={image?.alt || title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
            <ImagePlus size={28} />

            <span>Choose an image</span>
          </div>
        )}

        <label
          className="absolute inset-0 z-10 cursor-pointer"
          aria-label={`Upload ${title}`}
        >
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) onChoose(file);

              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {(src || pending) && (
          <button type="button" onClick={onRemove} className={actionClass}>
            <Trash2 size={14} />
            Remove image
          </button>
        )}

        {pending && (
          <button type="button" onClick={onUndo} className={actionClass}>
            Undo selection
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-500">
        JPG, PNG or WebP. Maximum 5 MB per image.
      </p>
    </div>
  );
}

export default function HomepageManagementPage() {
  const [data, setData] = useState(null);

  const [tab, setTab] = useState("categories");

  const [pending, setPending] = useState({});

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);

    setError("");

    setSuccess("");

    try {
      const result = await apiRequest("homepage/admin");

      const homepage = result?.data?.homepage;

      if (!homepage) {
        throw new Error(
          "Homepage configuration was missing from the API response.",
        );
      }

      setData(decorate(homepage));

      setPending({});
    } catch (err) {
      setError(err.message || "Unable to load homepage content.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const patch = (section, key, value) =>
    setData((prev) => ({
      ...prev,

      [section]: {
        ...prev[section],

        [key]: value,
      },
    }));

  const patchList = (section, key, value) =>
    setData((prev) => ({
      ...prev,

      [section]: prev[section].map((item) =>
        item._localKey === key ? { ...item, ...value } : item,
      ),
    }));

  const patchGallery = (key, value) =>
    setData((prev) => ({
      ...prev,

      about: {
        ...prev.about,

        gallery: prev.about.gallery.map((item) =>
          item._localKey === key ? { ...item, ...value } : item,
        ),
      },
    }));

  const choose = (key, file) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPG, PNG and WebP files are allowed.");

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Each image must be 5 MB or smaller.");

      return;
    }

    setError("");

    setSuccess("");

    setPending((prev) => ({
      ...prev,

      [key]: file,
    }));
  };

  const unchoose = (key) =>
    setPending((prev) => {
      const next = { ...prev };

      delete next[key];

      return next;
    });

  const removeImage = (key, callback) => {
    unchoose(key);

    callback();
  };

  const move = (section, index, delta) =>
    setData((prev) => {
      const arr = [...prev[section]];

      const to = index + delta;

      if (to < 0 || to >= arr.length) return prev;

      [arr[index], arr[to]] = [arr[to], arr[index]];

      return {
        ...prev,

        [section]: arr,
      };
    });

  const removeItem = (section, key) => {
    unchoose(key);

    setData((prev) => ({
      ...prev,

      [section]: prev[section].filter((item) => item._localKey !== key),
    }));
  };

  async function save() {
    if (!data || saving) return;

    setSaving(true);

    setError("");

    setSuccess("");

    try {
      const slugs = new Set();

      const categories = data.categories.map((item, index) => {
        const slug = slugify(item.slug || item.name);

        if (!item.name?.trim() || !slug) {
          throw new Error(`Category ${index + 1} needs a name and valid slug.`);
        }

        if (slugs.has(slug)) {
          throw new Error(`Duplicate category slug: ${slug}`);
        }

        slugs.add(slug);

        return {
          slug,

          name: item.name.trim(),

          description: item.description || "",

          image: item.image,

          isVisible: item.isVisible !== false,

          displayOrder: index + 1,
        };
      });

      const faqs = data.faqs.map((item, index) => {
        if (!item.question?.trim() || !item.answer?.trim()) {
          throw new Error(
            `FAQ ${index + 1} needs both a question and an answer.`,
          );
        }

        return {
          question: item.question,

          answer: item.answer,

          displayOrder: index + 1,

          isVisible: item.isVisible !== false,
        };
      });

      const gallery = data.about.gallery.map(
        ({ url, publicId, name, alt }) => ({
          url: url || "",

          publicId: publicId || "",

          name: name || "",

          alt: alt || "",
        }),
      );

      const content = {
        hero: data.hero,

        categories,

        about: {
          ...data.about,

          gallery,
        },

        faqs,

        sections: Array.isArray(data.sections) ? data.sections : [],

        contact: data.contact,
      };

      const body = new FormData();

      body.append("content", JSON.stringify(content));

      for (const item of data.categories) {
        const slug = slugify(item.slug || item.name);

        if (pending[item._localKey]) {
          body.append(`categoryImage_${slug}`, pending[item._localKey]);
        }
      }

      for (const [index, item] of data.about.gallery.entries()) {
        if (pending[item._localKey]) {
          body.append(`aboutImage_${index}`, pending[item._localKey]);
        }
      }

      const result = await apiRequest("homepage/admin", {
        method: "PATCH",

        body,
      });

      const homepage = result?.data?.homepage;

      if (!homepage) {
        throw new Error("The server did not return the saved homepage.");
      }

      setData(decorate(homepage));

      setPending({});

      setSuccess("Homepage changes saved successfully.");
    } catch (err) {
      setError(err.message || "Unable to save homepage changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm font-semibold text-[#103c2a]">
        <LoaderCircle className="animate-spin" size={20} />
        Loading homepage management...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl bg-white p-6">
        <p className="text-sm text-red-700">
          {error || "Homepage data unavailable."}
        </p>

        <button className={`${primaryClass} mt-4`} onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-24">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e2e9df] bg-white p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7b947d]">
            Website content
          </p>

          <h1 className="mt-1 text-xl font-extrabold text-[#103c2a] sm:text-2xl">
            Homepage Management
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Manage the content and images displayed on Kaduna Explorer.
          </p>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={load} className={actionClass}>
            <RefreshCw size={15} />
            Refresh
          </button>

          <Link href="/" target="_blank" className={actionClass}>
            View website
          </Link>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={17} className="shrink-0" />

          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          <CheckCircle2 size={17} />

          {success}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav
          aria-label="Homepage sections"
          className="grid grid-cols-2 gap-2 rounded-2xl border border-[#e2e9df] bg-white p-3 sm:grid-cols-4 lg:sticky lg:top-24 lg:grid-cols-1"
        >
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              aria-current={tab === item ? "page" : undefined}
              className={`rounded-xl px-4 py-3 text-left text-sm font-bold capitalize transition ${
                tab === item
                  ? "bg-[#103c2a] text-white"
                  : "text-slate-600 hover:bg-[#f2f6ef]"
              }`}
            >
              {item === "faqs" ? "FAQs" : item}
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-5">
          {tab === "categories" && (
            <Panel
              title="Homepage categories"
              description="Manage category cards. The slug is used to identify each image upload."
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {data.categories.length} categories
                </p>

                <button
                  type="button"
                  className={primaryClass}
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,

                      categories: [
                        ...prev.categories,

                        {
                          _localKey: uid(),

                          name: "",

                          slug: "",

                          description: "",

                          isVisible: true,

                          image: EMPTY_IMAGE(),
                        },
                      ],
                    }))
                  }
                >
                  <Plus size={15} />
                  Add category
                </button>
              </div>

              {data.categories.map((item, index) => (
                <div
                  key={item._localKey}
                  className="space-y-4 rounded-xl border border-[#e2e9df] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#103c2a]">
                      Category {index + 1}
                    </h3>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        className={actionClass}
                        disabled={index === 0}
                        onClick={() => move("categories", index, -1)}
                        aria-label="Move category up"
                      >
                        <ArrowUp size={15} />
                      </button>

                      <button
                        type="button"
                        className={actionClass}
                        disabled={index === data.categories.length - 1}
                        onClick={() => move("categories", index, 1)}
                        aria-label="Move category down"
                      >
                        <ArrowDown size={15} />
                      </button>

                      <button
                        type="button"
                        className={actionClass}
                        onClick={() => removeItem("categories", item._localKey)}
                        aria-label="Delete category"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Name"
                      value={item.name}
                      onChange={(v) =>
                        patchList("categories", item._localKey, {
                          name: v,
                        })
                      }
                    />

                    <Field
                      label="Slug"
                      value={item.slug}
                      onChange={(v) =>
                        patchList("categories", item._localKey, {
                          slug: slugify(v),
                        })
                      }
                      placeholder="Generated from name if empty"
                    />
                  </div>

                  <Field
                    label="Description"
                    value={item.description}
                    onChange={(v) =>
                      patchList("categories", item._localKey, {
                        description: v,
                      })
                    }
                    multiline
                  />

                  <ImageInput
                    title="Category image"
                    image={item.image}
                    pending={pending[item._localKey]}
                    onChoose={(f) => choose(item._localKey, f)}
                    onUndo={() => unchoose(item._localKey)}
                    onRemove={() =>
                      removeImage(item._localKey, () =>
                        patchList("categories", item._localKey, {
                          image: EMPTY_IMAGE(),
                        }),
                      )
                    }
                  />

                  <Field
                    label="Image alternative text"
                    value={item.image?.alt}
                    onChange={(v) =>
                      patchList("categories", item._localKey, {
                        image: {
                          ...item.image,

                          alt: v,
                        },
                      })
                    }
                  />

                  <label className="flex items-center gap-2 text-sm text-[#294638]">
                    <input
                      type="checkbox"
                      checked={item.isVisible !== false}
                      onChange={(e) =>
                        patchList("categories", item._localKey, {
                          isVisible: e.target.checked,
                        })
                      }
                    />
                    Visible on homepage
                  </label>
                </div>
              ))}

              {!data.categories.length && (
                <p className="rounded-xl bg-[#f3f7f1] p-6 text-center text-sm text-slate-500">
                  No categories yet. Add one above.
                </p>
              )}
            </Panel>
          )}

          {tab === "about" && (
            <Panel
              title="About gallery"
              description="Add as many gallery items as you need. Each image is limited to 5 MB."
            >
              <button
                type="button"
                className={primaryClass}
                onClick={() =>
                  setData((prev) => ({
                    ...prev,

                    about: {
                      ...prev.about,

                      gallery: [
                        ...prev.about.gallery,

                        {
                          ...EMPTY_IMAGE(),

                          _localKey: uid(),
                        },
                      ],
                    },
                  }))
                }
              >
                <Plus size={15} />
                Add gallery image
              </button>

              <div className="grid gap-4 sm:grid-cols-2">
                {data.about.gallery.map((item, index) => (
                  <div
                    key={item._localKey}
                    className="space-y-3 rounded-xl border border-[#e2e9df] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#103c2a]">
                        Image {index + 1}
                      </h3>

                      <button
                        type="button"
                        className={actionClass}
                        aria-label="Delete gallery item"
                        onClick={() => {
                          unchoose(item._localKey);

                          setData((prev) => ({
                            ...prev,

                            about: {
                              ...prev.about,

                              gallery: prev.about.gallery.filter(
                                (image) => image._localKey !== item._localKey,
                              ),
                            },
                          }));
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <ImageInput
                      title="Gallery image"
                      image={item}
                      pending={pending[item._localKey]}
                      onChoose={(f) => choose(item._localKey, f)}
                      onUndo={() => unchoose(item._localKey)}
                      onRemove={() =>
                        removeImage(item._localKey, () =>
                          patchGallery(item._localKey, EMPTY_IMAGE()),
                        )
                      }
                    />

                    <Field
                      label="Display name"
                      value={item.name}
                      onChange={(v) =>
                        patchGallery(item._localKey, {
                          name: v,
                        })
                      }
                      placeholder="e.g. Kajuru Castle"
                    />

                    <Field
                      label="Alternative text"
                      value={item.alt}
                      onChange={(v) =>
                        patchGallery(item._localKey, {
                          alt: v,
                        })
                      }
                      placeholder="Describe the image for accessibility"
                    />
                  </div>
                ))}
              </div>

              {!data.about.gallery.length && (
                <p className="text-sm text-slate-500">No gallery images yet.</p>
              )}
            </Panel>
          )}

          {tab === "faqs" && (
            <Panel
              title="Frequently asked questions"
              description="Write helpful answers to common visitor questions."
            >
              <button
                type="button"
                className={primaryClass}
                onClick={() =>
                  setData((prev) => ({
                    ...prev,

                    faqs: [
                      ...prev.faqs,

                      {
                        _localKey: uid(),

                        question: "",

                        answer: "",

                        isVisible: true,
                      },
                    ],
                  }))
                }
              >
                <Plus size={15} />
                Add FAQ
              </button>

              {data.faqs.map((item, index) => (
                <div
                  key={item._localKey}
                  className="space-y-4 rounded-xl border border-[#e2e9df] p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#103c2a]">
                      FAQ {index + 1}
                    </h3>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        className={actionClass}
                        disabled={index === 0}
                        onClick={() => move("faqs", index, -1)}
                        aria-label="Move FAQ up"
                      >
                        <ArrowUp size={15} />
                      </button>

                      <button
                        type="button"
                        className={actionClass}
                        disabled={index === data.faqs.length - 1}
                        onClick={() => move("faqs", index, 1)}
                        aria-label="Move FAQ down"
                      >
                        <ArrowDown size={15} />
                      </button>

                      <button
                        type="button"
                        className={actionClass}
                        onClick={() => removeItem("faqs", item._localKey)}
                        aria-label="Delete FAQ"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <Field
                    label="Question"
                    value={item.question}
                    onChange={(v) =>
                      patchList("faqs", item._localKey, {
                        question: v,
                      })
                    }
                  />

                  <Field
                    label="Answer"
                    value={item.answer}
                    onChange={(v) =>
                      patchList("faqs", item._localKey, {
                        answer: v,
                      })
                    }
                    multiline
                  />

                  <label className="flex items-center gap-2 text-sm text-[#294638]">
                    <input
                      type="checkbox"
                      checked={item.isVisible !== false}
                      onChange={(e) =>
                        patchList("faqs", item._localKey, {
                          isVisible: e.target.checked,
                        })
                      }
                    />
                    Visible on homepage
                  </label>
                </div>
              ))}

              {!data.faqs.length && (
                <p className="text-sm text-slate-500">No FAQs yet.</p>
              )}
            </Panel>
          )}
        </div>
      </div>

      <div className="sticky bottom-3 z-20 flex flex-col justify-between gap-3 rounded-2xl border border-[#dce7dc] bg-white/95 p-3 shadow-lg backdrop-blur-xl sm:flex-row sm:items-center sm:px-5">
        <p className="text-xs text-slate-500">
          Changes take effect after you save. The public homepage must be
          connected to the CMS separately.
        </p>

        <button
          type="button"
          disabled={saving}
          onClick={save}
          className={primaryClass}
        >
          {saving ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}

          {saving ? "Saving..." : "Save homepage changes"}
        </button>
      </div>
    </div>
  );
}
