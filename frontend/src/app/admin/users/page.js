"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  RefreshCw,
  LoaderCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Eye,
  X,
  Mail,
  ShieldCheck,
  CalendarDays,
  UserRound,
  Filter,
  RotateCcw,
  CheckCircle2,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

const PAGE_SIZE = 10;

const INPUT_CLASS =
  "w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#176B48] focus:ring-4 focus:ring-emerald-900/5";

function getUsersFromResponse(response) {
  const candidates = [response?.data?.data, response?.data, response];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;

    if (Array.isArray(candidate?.users)) return candidate.users;
    if (Array.isArray(candidate?.results)) return candidate.results;
    if (Array.isArray(candidate?.items)) return candidate.items;
  }

  return [];
}

function getPaginationTotal(response, fallback) {
  const candidates = [
    response?.data?.pagination,
    response?.data?.data?.pagination,
    response?.pagination,
    response?.data?.data,
    response?.data,
    response,
  ];

  for (const item of candidates) {
    if (!item || typeof item !== "object") continue;

    const total =
      item.total ?? item.totalUsers ?? item.totalResults ?? item.totalItems;

    if (total !== undefined && Number.isFinite(Number(total))) {
      return Number(total);
    }
  }

  return fallback;
}

function getUserId(user) {
  return user?._id || user?.id || "";
}

function getUserName(user) {
  return (
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.fullName ||
    "Unnamed user"
  );
}

function getUserRole(user) {
  return String(user?.role || user?.userRole || "user").toLowerCase();
}

function getUserEmail(user) {
  return user?.email || "";
}

function getCreatedDate(user) {
  const value = user?.createdAt || user?.created_at;

  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(user) {
  const date = getCreatedDate(user);

  if (!date) return "Not available";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInitials(name) {
  return String(name || "U")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    "We couldn't load the user accounts."
  );
}

function getStatus(user) {
  if (user?.isActive === false || user?.active === false) {
    return "inactive";
  }

  if (user?.isActive === true || user?.active === true) {
    return "active";
  }

  return "unknown";
}

function Badge({ children, tone = "gray" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/10",
    red: "bg-red-50 text-red-700 ring-red-600/10",
    blue: "bg-blue-50 text-blue-700 ring-blue-600/10",
    gray: "bg-gray-100 text-gray-600 ring-gray-500/10",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset ${
        tones[tone] || tones.gray
      }`}
    >
      {children}
    </span>
  );
}

function MetricCard({ title, value, description, icon: Icon, tone }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    gray: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="min-w-0 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-3 break-words text-3xl font-extrabold tracking-tight text-[#103C2A]">
            {value.toLocaleString("en-NG")}
          </p>
          <p className="mt-2 text-xs leading-5 text-gray-500">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            tones[tone] || tones.gray
          }`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function UserAvatar({ user, size = "normal" }) {
  const dimension =
    size === "large"
      ? "h-14 w-14 rounded-2xl text-base"
      : "h-10 w-10 rounded-xl text-xs";

  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-[#103C2A]/5 font-bold text-[#176B48] ${dimension}`}
      aria-label={`${getUserName(user)} avatar`}
    >
      {getInitials(getUserName(user))}
    </div>
  );
}

function UserDetailsModal({ user, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const email = getUserEmail(user);
  const role = getUserRole(user);
  const status = getStatus(user);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-details-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar user={user} size="large" />
            <div className="min-w-0">
              <h2
                id="user-details-title"
                className="break-words text-lg font-extrabold text-[#103C2A]"
              >
                {getUserName(user)}
              </h2>
              <p className="mt-1 break-all text-sm text-gray-500">
                {email || "No email available"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close user details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Account role</p>
              <div className="mt-2">
                <Badge tone={role === "admin" ? "green" : "blue"}>{role}</Badge>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">
                Account status
              </p>
              <div className="mt-2">
                <Badge
                  tone={
                    status === "active"
                      ? "green"
                      : status === "inactive"
                        ? "red"
                        : "gray"
                  }
                >
                  {status === "unknown" ? "Not provided by API" : status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail size={18} className="mt-0.5 shrink-0 text-gray-400" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Email address</p>
                <p className="mt-1 break-all text-sm font-medium text-gray-800">
                  {email || "Not available"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-gray-400"
              />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Role</p>
                <p className="mt-1 text-sm font-medium capitalize text-gray-800">
                  {role}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CalendarDays
                size={18}
                className="mt-0.5 shrink-0 text-gray-400"
              />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Registration date</p>
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {formatDate(user)}
                </p>
              </div>
            </div>

            {getUserId(user) && (
              <div className="flex items-start gap-3">
                <UserRound
                  size={18}
                  className="mt-0.5 shrink-0 text-gray-400"
                />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">User ID</p>
                  <p className="mt-1 break-all font-mono text-xs text-gray-700">
                    {getUserId(user)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs leading-5 text-blue-800">
              This view displays information returned by the API. Account
              permissions and status must be changed through verified
              administrative endpoints.
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-100 p-5 sm:px-6">
          {email ? (
            <a
              href={`mailto:${email}`}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#103C2A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#176B48]"
            >
              <Mail size={16} />
              Contact user
              <ExternalLink size={13} />
            </a>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-xl bg-[#103C2A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#176B48]"
            >
              Close
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);

  const loadUsers = useCallback(
    async (manual = false) => {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          search,
          role: roleFilter,
          status: statusFilter,
          sort: sortOrder,
        });

        const response = await apiRequest(`users?${params.toString()}`);
        const list = getUsersFromResponse(response);
        const total = getPaginationTotal(response, list.length);

        setUsers(list);
        setTotalUsers(total);
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, roleFilter, statusFilter, sortOrder],
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const filteredUsers = users;

  const pageCount = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));

  const adminCount = users.filter(
    (user) => getUserRole(user) === "admin",
  ).length;

  const activeCount = users.filter(
    (user) => getStatus(user) === "active",
  ).length;

  const hasFilters =
    searchInput.trim() !== "" ||
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    sortOrder !== "newest";

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setSortOrder("newest");
    setPage(1);
  }

  function changePage(nextPage) {
    setPage(Math.max(1, Math.min(pageCount, nextPage)));
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-6">
      {/* Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#103C2A] text-[#FFBD4A]">
              <Users size={23} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#103C2A] sm:text-3xl">
                Users
              </h1>
              <p className="mt-1 text-sm leading-5 text-gray-500">
                Review registered accounts and their available details.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadUsers(true)}
          disabled={loading || refreshing}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-emerald-200 hover:text-[#176B48] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing || loading ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <RefreshCw size={17} />
          )}
          Refresh users
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-700" />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-red-900">
              Unable to load users
            </p>
            <p className="mt-1 break-words text-sm leading-5 text-red-800">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadUsers(true)}
            disabled={refreshing}
            className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-red-800 transition hover:bg-red-100 disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Registered users"
          value={totalUsers}
          description="Accounts matching the current filters"
          icon={Users}
          tone="green"
        />

        <MetricCard
          title="Administrators"
          value={adminCount}
          description="Administrators on this page"
          icon={ShieldCheck}
          tone="amber"
        />

        <MetricCard
          title="Active accounts"
          value={activeCount}
          description="Active accounts on this page"
          icon={CheckCircle2}
          tone="blue"
        />
      </div>

      {/* Search and filters */}
      <section className="min-w-0 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <Filter size={17} className="text-[#176B48]" />
          <h2 className="text-sm font-bold text-gray-800">
            Search and filter accounts
          </h2>
        </div>

        <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_minmax(140px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto]">
          <div className="relative min-w-0">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name, email, or ID..."
              aria-label="Search users"
              className={`${INPUT_CLASS} pl-10 pr-10`}
            />

            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
            className={INPUT_CLASS}
          >
            <option value="all">All roles</option>
            <option value="admin">Administrators</option>
            <option value="user">Regular users</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by account status"
            className={INPUT_CLASS}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value);
              setPage(1);
            }}
            aria-label="Sort users"
            className={INPUT_CLASS}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={15} />
            Clear
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
          <span>
            {totalUsers.toLocaleString("en-NG")} matching result
            {totalUsers === 1 ? "" : "s"} across all pages
          </span>

          <span>
            Page {page} of {pageCount}
          </span>
        </div>
      </section>

      {/* User list */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-bold text-[#103C2A]">
              Registered accounts
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Select View details to inspect an account.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500">
            <ArrowUpDown size={13} />
            {sortOrder === "name"
              ? "Name A–Z"
              : sortOrder === "oldest"
                ? "Oldest first"
                : "Newest first"}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
            <LoaderCircle size={30} className="animate-spin text-[#176B48]" />
            <p className="mt-4 text-sm font-semibold text-gray-700">
              Loading accounts...
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Retrieving user records from the API.
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
              <Users size={26} />
            </div>

            <h3 className="mt-4 text-base font-bold text-gray-800">
              {users.length === 0
                ? "No user records found"
                : "No matching accounts"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              {users.length === 0
                ? "The API returned no users for this page."
                : "Try changing your search or filters to see more accounts."}
            </p>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#103C2A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#176B48]"
              >
                <RotateCcw size={15} />
                Clear filters
              </button>
            )}

            {users.length === 0 && !error && (
              <button
                type="button"
                onClick={() => loadUsers(true)}
                className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <RefreshCw size={15} />
                Reload accounts
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      User
                    </th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Role
                    </th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Joined
                    </th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user, index) => {
                    const role = getUserRole(user);
                    const status = getStatus(user);

                    return (
                      <tr
                        key={
                          getUserId(user) || `${getUserEmail(user)}-${index}`
                        }
                        className="transition hover:bg-gray-50/80"
                      >
                        <td className="px-6 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar user={user} />

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-gray-800">
                                {getUserName(user)}
                              </p>
                              <p className="mt-1 max-w-[240px] truncate text-xs text-gray-500">
                                {getUserEmail(user) || "No email available"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <Badge tone={role === "admin" ? "green" : "blue"}>
                            {role}
                          </Badge>
                        </td>

                        <td className="px-4 py-4">
                          <Badge
                            tone={
                              status === "active"
                                ? "green"
                                : status === "inactive"
                                  ? "red"
                                  : "gray"
                            }
                          >
                            {status === "unknown" ? "Unknown" : status}
                          </Badge>
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-600">
                          {formatDate(user)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(user)}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#176B48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B48]"
                          >
                            <Eye size={14} />
                            View details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile and tablet cards */}
            <div className="grid grid-cols-1 gap-0 divide-y divide-gray-100 md:hidden">
              {filteredUsers.map((user, index) => {
                const role = getUserRole(user);
                const status = getStatus(user);

                return (
                  <article
                    key={getUserId(user) || `${getUserEmail(user)}-${index}`}
                    className="min-w-0 p-4 sm:p-5"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <UserAvatar user={user} />

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-bold text-gray-800">
                          {getUserName(user)}
                        </h3>

                        <p className="mt-1 break-all text-xs text-gray-500">
                          {getUserEmail(user) || "No email available"}
                        </p>

                        <p className="mt-2 text-xs text-gray-500">
                          Joined {formatDate(user)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge tone={role === "admin" ? "green" : "blue"}>
                        {role}
                      </Badge>

                      <Badge
                        tone={
                          status === "active"
                            ? "green"
                            : status === "inactive"
                              ? "red"
                              : "gray"
                        }
                      >
                        {status === "unknown" ? "Status unknown" : status}
                      </Badge>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      <Eye size={16} />
                      View details
                    </button>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && totalUsers > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs leading-5 text-gray-500">
              Showing page {page} of {pageCount} ·{" "}
              {totalUsers.toLocaleString("en-NG")} total accounts reported
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Previous</span>
              </button>

              <span className="min-w-16 text-center text-xs font-semibold text-gray-600">
                {page} / {pageCount}
              </span>

              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={page >= pageCount || loading}
                aria-label="Next page"
                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      <footer className="flex flex-col gap-2 border-t border-gray-200 py-5 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <p>Kaduna Explorer · User management</p>

        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 self-start transition hover:text-[#176B48] sm:self-auto"
        >
          Back to overview
          <ChevronRight size={13} />
        </Link>
      </footer>

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
