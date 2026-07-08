"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import TopBar from "@/components/ui/TopBar";
import {
  Route,
  Camera,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  ArrowRight,
  Map,
  Search,
} from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { JourneyListSkeleton } from "@/components/ui/Skeleton";

const JourneyMap = dynamic(() => import("@/components/ui/JourneyMap"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full flex items-center justify-center rounded-2xl bg-[#0f0f1a]"
      style={{ height: 360 }}
    >
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#e8a000] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-[#78899a]">
          Acquiring telemetry data…
        </p>
      </div>
    </div>
  ),
});

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface JourneySighting {
  id: string;
  cameraId?: string;
  cameraName?: string;
  zone?: string;
  lat?: number;
  lng?: number;
  seenAt: string;
  thumbnailBase64?: string;
  confidence: number;
}

interface Journey {
  id: string;
  plateText: string;
  status: "active" | "closed";
  startedAt: string;
  lastSeenAt: string;
  sightings: JourneySighting[];
}

function formatDuration(startedAt: string, lastSeenAt: string) {
  const ms = new Date(lastSeenAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function SightingDot({
  sighting,
  index,
  total,
}: {
  sighting: JourneySighting;
  index: number;
  total: number;
}) {
  const { isLightMode } = useTheme();
  const sightingBg = isLightMode ? "bg-[#F2F2F7]" : "bg-[#12161a]";
  const thBorder = isLightMode ? "border-white" : "border-[#222831]";
  const headingColor = isLightMode ? "text-slate-800" : "text-[#c8d0d8]";
  const secTextColor = isLightMode ? "text-slate-400" : "text-[#78899a]";
  const lineBg = isLightMode ? "bg-slate-200" : "bg-[#222831]";
  const mapPinBg = "bg-[#0A7E8C]/10 text-[#0A7E8C]";

  return (
    <div className="flex gap-3 items-start">
      <div className="flex flex-col items-center flex-shrink-0 w-7 mt-1">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white"
          style={{
            background:
              index === 0
                ? "#0A7E8C"
                : index === total - 1
                  ? "#30D158"
                  : "#FF9500",
          }}
        >
          {index + 1}
        </div>
        {index < total - 1 && (
          <div className={`w-px flex-1 min-h-[32px] mt-1 ${lineBg}`} />
        )}
      </div>

      <div className="flex-1 pb-4">
        <div className={`flex items-start gap-3 p-3 rounded-2xl ${sightingBg}`}>
          {sighting.thumbnailBase64 ? (
            <img
              src={`data:image/jpeg;base64,${sighting.thumbnailBase64}`}
              alt="plate"
              className={`w-16 h-10 object-cover rounded-2xl flex-shrink-0 border shadow-sm ${thBorder}`}
            />
          ) : (
            <div
              className={`w-16 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isLightMode
                  ? "bg-slate-200 text-slate-400"
                  : "bg-black/35 text-[#3d4f5e]"
              }`}
            >
              <Camera size={14} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-bold truncate ${headingColor}`}>
                {sighting.cameraName ?? sighting.cameraId ?? "Unknown camera"}
              </span>
              {sighting.zone && (
                <span
                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${mapPinBg}`}
                >
                  <MapPin size={9} />
                  {sighting.zone}
                </span>
              )}
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(48,209,88,0.1)", color: "#30D158" }}
              >
                {Math.round(sighting.confidence * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock size={10} className={`${secTextColor} flex-shrink-0`} />
              <span className={`text-[11px] font-medium ${secTextColor}`}>
                {formatTime(sighting.seenAt)} · {formatDate(sighting.seenAt)}
              </span>
            </div>
            {sighting.lat != null && sighting.lng != null && (
              <span
                className={`text-[10px] font-medium ${isLightMode ? "text-slate-300" : "text-[#3d4f5e]"}`}
              >
                {sighting.lat.toFixed(5)}, {sighting.lng.toFixed(5)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function JourneyRow({ journey }: { journey: Journey }) {
  const { isLightMode } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const cameras = [
    ...new Set(journey.sightings.map((s) => s.cameraName ?? s.cameraId ?? "?")),
  ];
  const isActive = journey.status === "active";
  const crossCamera =
    new Set(journey.sightings.map((s) => s.cameraId)).size > 1;
  const hasGps = journey.sightings.some((s) => s.lat != null && s.lng != null);

  const cardBg = isLightMode
    ? "bg-white border-slate-100"
    : "bg-[#0e1114] border-[#222831]";
  const hoverBg = isLightMode ? "hover:bg-slate-50/50" : "hover:bg-[#12161a]";
  const borderBottom = isLightMode ? "border-slate-50" : "border-[#181d22]";
  const textHeading = isLightMode ? "text-slate-800" : "text-[#c8d0d8]";
  const textSecondary = isLightMode ? "text-slate-400" : "text-[#78899a]";
  const selectBg = isLightMode ? "bg-slate-100" : "bg-[#181d22]";

  return (
    <div className={`overflow-hidden border rounded-2xl shadow-sm ${cardBg}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`w-full text-left px-5 py-4 flex items-center gap-4 transition-colors ${hoverBg}`}
      >
        <span
          className={`plate-badge text-[12px] flex-shrink-0 ${
            isLightMode
              ? ""
              : "bg-[#0a0c0e] border border-[#222831] text-[#c8d0d8]"
          }`}
        >
          {journey.plateText}
        </span>

        <span
          className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-tight flex items-center gap-1.5 flex-shrink-0"
          style={
            isActive
              ? isLightMode
                ? { color: "#30D158", background: "rgba(48,209,88,0.1)" }
                : { color: "#2db55d", background: "rgba(45,181,93,0.1)" }
              : isLightMode
                ? { color: "#8E8E93", background: "#F2F2F7" }
                : {
                    color: "#78899a",
                    background: "#181d22",
                    border: "1px solid #222831",
                  }
          }
        >
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] pulse-dot" />
          )}
          {isActive ? "Active" : "Closed"}
        </span>

        {crossCamera && (
          <span
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0"
            style={{ color: "#FF9500", background: "rgba(255,149,0,0.1)" }}
          >
            <Route size={9} />
            {cameras.length} cameras
          </span>
        )}

        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
          {cameras.slice(0, 4).map((cam, i) => (
            <span
              key={i}
              className={`flex items-center gap-1 text-[11px] font-medium flex-shrink-0 ${textSecondary}`}
            >
              {i > 0 && (
                <ArrowRight
                  size={9}
                  className={isLightMode ? "text-slate-300" : "text-[#3d4f5e]"}
                />
              )}
              <span className="truncate max-w-[100px]">{cam}</span>
            </span>
          ))}
          {cameras.length > 4 && (
            <span
              className={`text-[11px] font-medium flex-shrink-0 ${isLightMode ? "text-slate-300" : "text-[#3d4f5e]"}`}
            >
              +{cameras.length - 4} more
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 text-right">
          <div className="text-right">
            <p className={`text-[11px] font-bold ${textHeading}`}>
              {journey.sightings.length} sighting
              {journey.sightings.length !== 1 ? "s" : ""}
            </p>
            <p className={`text-[10px] font-medium ${textSecondary}`}>
              {formatDuration(journey.startedAt, journey.lastSeenAt)}
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-[11px] font-bold ${isLightMode ? "text-slate-600" : "text-[#c8d0d8]"}`}
            >
              {formatTime(journey.startedAt)}
            </p>
            <p className={`text-[10px] font-medium ${textSecondary}`}>
              {formatDate(journey.startedAt)}
            </p>
          </div>
          {expanded ? (
            <ChevronUp
              size={16}
              className={`${isLightMode ? "text-slate-300" : "text-[#3d4f5e]"} flex-shrink-0`}
            />
          ) : (
            <ChevronDown
              size={16}
              className={`${isLightMode ? "text-slate-300" : "text-[#3d4f5e]"} flex-shrink-0`}
            />
          )}
        </div>
      </button>

      {expanded && (
        <div
          className={`border-t animate-in slide-in-from-top-2 duration-200 ${borderBottom}`}
        >
          {hasGps && (
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`relative flex p-0.5 rounded-2xl shadow-sm gap-0.5 ${selectBg}`}
                >
                  {/* Sliding Pill */}
                  <div
                    className={`absolute top-0.5 bottom-0.5 rounded transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                      isLightMode ? "bg-white shadow-sm" : "bg-[#222831]"
                    }`}
                    style={{
                      width: "80px",
                      left: showMap ? "2px" : "84px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    }}
                  />
                  <button
                    onClick={() => setShowMap(true)}
                    className="relative z-10 flex items-center justify-center gap-1.5 h-7 text-xs font-bold transition-colors duration-300"
                    style={{
                      width: "80px",
                      color: showMap
                        ? "#0A7E8C"
                        : isLightMode
                          ? "#8E8E93"
                          : "#78899a",
                    }}
                  >
                    <Map size={12} />
                    Map
                  </button>
                  <button
                    onClick={() => setShowMap(false)}
                    className="relative z-10 flex items-center justify-center gap-1.5 h-7 text-xs font-bold transition-colors duration-300"
                    style={{
                      width: "80px",
                      color: !showMap
                        ? "#0A7E8C"
                        : isLightMode
                          ? "#8E8E93"
                          : "#78899a",
                    }}
                  >
                    <Route size={12} />
                    Timeline
                  </button>
                </div>
                <span className={`text-xs font-medium ml-1 ${textSecondary}`}>
                  {journey.sightings.filter((s) => s.lat != null).length} of{" "}
                  {journey.sightings.length} sightings mapped
                </span>
              </div>

              <div
                key={showMap ? "map" : "timeline"}
                className="animate-in fade-in duration-300"
              >
                {showMap ? (
                  <JourneyMap
                    sightings={journey.sightings}
                    plateText={journey.plateText}
                  />
                ) : (
                  <div className="space-y-0 pt-1">
                    {journey.sightings
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(a.seenAt).getTime() -
                          new Date(b.seenAt).getTime(),
                      )
                      .map((s, i) => (
                        <SightingDot
                          key={s.id}
                          sighting={s}
                          index={i}
                          total={journey.sightings.length}
                        />
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!hasGps && (
            <div className="px-5 pt-3 pb-4">
              <div className="space-y-0">
                {journey.sightings
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(a.seenAt).getTime() -
                      new Date(b.seenAt).getTime(),
                  )
                  .map((s, i) => (
                    <SightingDot
                      key={s.id}
                      sighting={s}
                      index={i}
                      total={journey.sightings.length}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function JourneysClient() {
  const { isLightMode } = useTheme();
  const [plateFilter, setPlateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">(
    "all",
  );

  const qs = new URLSearchParams();
  if (plateFilter) qs.set("plate", plateFilter);
  if (statusFilter !== "all") qs.set("status", statusFilter);
  qs.set("limit", "50");

  const { data, isLoading } = useSWR<{ data: Journey[]; total: number }>(
    `/api/journeys?${qs}`,
    fetcher,
    { refreshInterval: 10_000 },
  );

  const journeys = data?.data ?? [];
  const total = data?.total ?? 0;
  const activeCount = journeys.filter((j) => j.status === "active").length;

  const secTextColor = isLightMode ? "text-slate-400" : "text-[#78899a]";
  const cardBg = isLightMode ? "bg-white" : "bg-[#0e1114]";
  const cardBorder = isLightMode
    ? "border border-slate-100"
    : "border border-[#222831]";
  const inputBg = isLightMode
    ? "bg-[#F2F2F7] text-[#1D1D1F] border-transparent focus-within:border-slate-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-100/50"
    : "bg-[#181d22] text-[#c8d0d8] border-[#222831] focus-within:border-[#2f3844] focus-within:bg-[#0e1114] focus-within:ring-4 focus-within:ring-blue-500/5";
  const filterTabBg = isLightMode
    ? "bg-white"
    : "bg-[#0e1114] border border-[#222831]";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Journeys" connected={true} />

      <main className="flex-1 p-6 max-w-5xl w-full mx-auto space-y-5 overflow-y-auto">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div
            className={`flex-1 flex items-center gap-2.5 px-3.5 h-10 rounded-2xl border transition-all ${inputBg}`}
          >
            <Search
              size={15}
              strokeWidth={2.5}
              className={isLightMode ? "text-slate-400" : "text-[#78899a]"}
            />
            <input
              type="text"
              placeholder="Search plate…"
              value={plateFilter}
              onChange={(e) => setPlateFilter(e.target.value.toUpperCase())}
              className="flex-1 text-sm font-medium outline-none bg-transparent placeholder-slate-500"
            />
          </div>
          <div
            className={`relative flex p-1 rounded-2xl shadow-sm ml-auto ${filterTabBg}`}
          >
            {/* Sliding Pill */}
            <div
              className={`absolute top-1 bottom-1 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isLightMode
                  ? "bg-[#0A7E8C] shadow-sm border border-transparent"
                  : "bg-[#222831] border border-[#222831]"
              }`}
              style={{
                width: "80px",
                left:
                  statusFilter === "all"
                    ? "4px"
                    : statusFilter === "active"
                      ? "84px"
                      : "164px",
              }}
            />
            {(["all", "active", "closed"] as const).map((s) => {
              const active = statusFilter === s;
              const activeColor = isLightMode ? "#fff" : "#0A7E8C";
              const inactiveColor = isLightMode ? "#8E8E93" : "#78899a";
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="relative z-10 py-1.5 text-sm font-bold capitalize transition-colors duration-300 flex items-center justify-center"
                  style={{
                    width: "80px",
                    color: active ? activeColor : inactiveColor,
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <span className={`text-xs font-bold ${secTextColor}`}>
            {total} journey{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Journey list */}
        {isLoading ? (
          <JourneyListSkeleton count={3} />
        ) : journeys.length === 0 ? (
          <div
            className={`py-24 text-center rounded-2xl border ${cardBg} ${cardBorder}`}
          >
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                isLightMode ? "bg-slate-50" : "bg-[#12161a]"
              }`}
            >
              <Route
                size={32}
                className={isLightMode ? "text-slate-200" : "text-[#3d4f5e]"}
                strokeWidth={1.5}
              />
            </div>
            <p
              className={`text-lg font-bold ${isLightMode ? "text-slate-800" : "text-[#c8d0d8]"}`}
            >
              No Journeys Yet
            </p>
            <p className={`text-sm mt-1 ${secTextColor}`}>
              Journeys are recorded when cameras detect plates. Make sure
              cameras are active.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {journeys.map((j) => (
              <JourneyRow key={j.id} journey={j} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
