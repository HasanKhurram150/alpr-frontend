"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import {
  Camera,
  List,
  Users,
  ShieldAlert,
  Bell,
  BarChart3,
  Video,
  Route,
  MonitorPlay,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Check,
  Car,
  User,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Alert } from "@/types";
import { useTheme } from "@/lib/ThemeContext";

const nav = [
  { href: "/admin/detect", icon: Camera, label: "Detection" },
  { href: "/admin/cameras", icon: Video, label: "Cameras" },
  { href: "/admin/events", icon: List, label: "Events" },
  { href: "/admin/journeys", icon: Route, label: "Journeys" },
  { href: "/admin/persons", icon: Users, label: "Persons" },
  { href: "/admin/watchlist", icon: ShieldAlert, label: "Watchlist" },
  { href: "/admin/alerts", icon: Bell, label: "Alerts" },
  { href: "/admin/reports", icon: BarChart3, label: "Reports" },
];

export default function Sidebar({
  alertCount,
  sidebarAlerts = [],
  onAcknowledge,
  minimized,
  onToggle,
}: {
  alertCount: number;
  sidebarAlerts?: Alert[];
  onAcknowledge?: (id: string) => void;
  minimized?: boolean;
  onToggle?: () => void;
}) {
  const { isLightMode } = useTheme();
  const path = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAlerts = sidebarAlerts.filter((a) => !dismissed.has(a.id));
  const unacked = visibleAlerts.filter((a) => !a.acknowledged);

  function handleAcknowledge(id: string) {
    onAcknowledge?.(id);
  }

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  // Theme-aware color variables
  const bg = "var(--brand-card)";
  const border = "var(--brand-border)";
  const txt = "var(--brand-content)";
  const txtActive = "var(--brand-primary)";
  const bgActive = "rgba(10, 126, 140, 0.12)";
  const txtSec = "var(--brand-muted)";
  const hoverBg = "rgba(18, 97, 128, 0.12)";
  const divider = "var(--brand-border)";
  const btnText = "var(--brand-primary)";
  const btnHoverBg = "rgba(10, 126, 140, 0.08)";

  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex flex-col z-50 transition-all duration-300 ease-in-out ${minimized ? "w-[80px]" : "w-[240px]"}`}
      style={{
        background: bg,
        borderRight: `1px solid ${border}`,
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      {/* Brand */}
      <div
        className="pt-5 pb-4 flex-shrink-0 flex items-center overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          paddingLeft: minimized ? "22px" : "16px",
          paddingRight: minimized ? "22px" : "16px",
        }}
      >
        <div
          className="flex items-center transition-all duration-300 ease-in-out"
          style={{ gap: minimized ? "0px" : "12px" }}
        >
          <Image
            src="/Logo.png"
            alt="MITS"
            width={36}
            height={36}
            className="flex-shrink-0"
            style={{
              objectFit: "contain",
              filter: isLightMode ? "invert(1)" : "none",
            }}
          />
          <div
            className={`flex flex-col transition-all duration-300 ease-in-out origin-left overflow-hidden ${minimized ? "opacity-0 w-0 scale-x-50 pointer-events-none" : "opacity-100 w-[100px] scale-x-100"}`}
          >
            <Image
              src="/M.I.T.S.png"
              alt="M.I.T.S."
              width={72}
              height={16}
              style={{
                objectFit: "contain",
                filter: isLightMode ? "invert(1)" : "none",
              }}
            />
            <p
              className="text-[10px] font-semibold mt-0.5 whitespace-nowrap"
              style={{ color: txtSec }}
            >
              Admin Panel
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        className="mx-4 flex-shrink-0"
        style={{ height: 1, background: divider }}
      />

      {/* Nav */}
      <nav className="flex-shrink-0 px-2 py-3 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={minimized ? label : undefined}
              className="flex items-center rounded-2xl text-sm font-medium transition-all duration-300 ease-in-out relative overflow-hidden h-9"
              style={{
                color: active ? txtActive : txt,
                background: active ? bgActive : "transparent",
                fontWeight: active ? 600 : 500,
                paddingLeft: minimized ? "23.5px" : "12px",
                paddingRight: minimized ? "0px" : "12px",
              }}
              onMouseEnter={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.background = hoverBg;
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
              }}
            >
              <Icon
                size={17}
                className="flex-shrink-0 animate-in fade-in duration-300"
                strokeWidth={active ? 2.2 : 1.8}
                style={{
                  color: active ? txtActive : txtSec,
                  marginLeft: "0px",
                }}
              />
              <span
                className={`transition-all duration-300 ease-in-out origin-left whitespace-nowrap overflow-hidden ${minimized ? "opacity-0 w-0 ml-0 scale-x-50 pointer-events-none" : "opacity-100 w-[120px] ml-3 scale-x-100"}`}
              >
                {label}
              </span>
              {label === "Alerts" && alertCount > 0 && (
                <span
                  className={`text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center transition-all duration-300 ease-in-out absolute ${minimized ? "top-1 right-1.5 translate-y-0 scale-[0.85]" : "top-1/2 right-3 -translate-y-1/2 scale-100"}`}
                  style={{
                    background: "#d93a3a",
                    lineHeight: 1,
                  }}
                >
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div
        className="mx-4 flex-shrink-0"
        style={{ height: 1, background: divider }}
      />

      {/* ── LIVE ALERT DRAWER ─────────────────────────── */}
      {visibleAlerts.length > 0 && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Drawer toggle header */}
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            aria-label="Toggle live alerts drawer"
            title={minimized ? "Live Alerts" : undefined}
            className="flex items-center py-2.5 transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden"
            style={{
              paddingLeft: minimized ? "30px" : "12px",
              paddingRight: minimized ? "0px" : "12px",
              borderBottom: `1px solid ${drawerOpen && !minimized ? "rgba(217,58,58,0.15)" : "rgba(217,58,58,0)"}`,
            }}
          >
            <div
              className="w-5 h-5 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
              style={{ background: "rgba(217,58,58,0.1)" }}
            >
              <Bell size={11} style={{ color: "#d93a3a" }} strokeWidth={2.5} />
              {minimized && unacked.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-white text-[9px] font-black rounded-full min-w-[14px] h-[14px] px-0.5 flex items-center justify-center transition-all duration-300 ease-in-out"
                  style={{ background: "#d93a3a", lineHeight: 1 }}
                >
                  {unacked.length > 9 ? "9+" : unacked.length}
                </span>
              )}
            </div>
            <div
              className={`flex items-center flex-1 transition-all duration-300 ease-in-out origin-left overflow-hidden ${minimized ? "opacity-0 w-0 ml-0 scale-x-50 pointer-events-none" : "opacity-100 w-[160px] ml-2 scale-x-100"}`}
            >
              <span
                className="text-[11px] font-black uppercase tracking-wider flex-1 text-left whitespace-nowrap"
                style={{ color: "#d93a3a" }}
              >
                Live Alerts
              </span>
              {unacked.length > 0 && (
                <span
                  className="text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center mr-2"
                  style={{ background: "#d93a3a", lineHeight: 1 }}
                >
                  {unacked.length > 9 ? "9+" : unacked.length}
                </span>
              )}
              {drawerOpen ? (
                <ChevronUp
                  size={12}
                  className="flex-shrink-0"
                  style={{ color: "#d93a3a" }}
                />
              ) : (
                <ChevronDown
                  size={12}
                  className="flex-shrink-0"
                  style={{ color: "#d93a3a" }}
                />
              )}
            </div>
          </button>

          {/* Scrollable alert list */}
          <div
            className="flex-1 overflow-hidden transition-all duration-300 ease-in-out flex flex-col"
            style={{
              maxHeight: drawerOpen && !minimized ? "1000px" : "0px",
              opacity: drawerOpen && !minimized ? 1 : 0,
              pointerEvents: drawerOpen && !minimized ? "auto" : "none",
            }}
          >
            <div
              className="flex-1 overflow-y-auto"
              style={{ scrollbarWidth: "thin" }}
            >
              {visibleAlerts.slice(0, 10).map((alert, i) => {
                const isAcked = alert.acknowledged;
                const hasPerson = !!alert.personName;
                const hasPlateImg = !!alert.thumbnailBase64;
                const hasPersonFace = !!alert.personFaceThumbnail;

                return (
                  <div
                    key={alert.id}
                    className="px-3 py-2.5 transition-all"
                    style={{
                      borderBottom: "1px solid rgba(217,58,58,0.08)",
                      background: isAcked
                        ? "transparent"
                        : "rgba(217,58,58,0.025)",
                      opacity: isAcked ? 0.6 : 1,
                    }}
                  >
                    {/* Plate + image row */}
                    <div className="flex items-start gap-2 mb-1.5">
                      {/* Plate capture thumbnail */}
                      {hasPlateImg ? (
                        <img
                          src={`data:image/jpeg;base64,${alert.thumbnailBase64}`}
                          alt={alert.plateText}
                          className="rounded-2xl object-cover flex-shrink-0"
                          style={{
                            width: 56,
                            height: 38,
                            border: "1.5px solid rgba(217,58,58,0.3)",
                          }}
                        />
                      ) : (
                        <div
                          className="rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{
                            width: 56,
                            height: 38,
                            background: "rgba(217,58,58,0.07)",
                            border: "1.5px solid rgba(217,58,58,0.18)",
                          }}
                        >
                          <Car
                            size={16}
                            style={{ color: "#d93a3a", opacity: 0.5 }}
                            strokeWidth={1.5}
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Plate number */}
                        <p
                          className="text-[12px] font-black tracking-widest leading-tight"
                          style={{ color: "#d93a3a", fontFamily: "monospace" }}
                        >
                          {alert.plateText}
                        </p>
                        {/* Time */}
                        <p
                          className="text-[9px] font-medium mt-0.5"
                          style={{ color: "#8E8E93" }}
                        >
                          {new Date(alert.timestamp).toLocaleTimeString(
                            "en-PK",
                            { hour12: false },
                          )}
                          {isAcked && (
                            <span className="ml-1.5 text-green-500 font-bold">
                              ✓ ACKED
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Dismiss */}
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        aria-label="Dismiss alert"
                        className="w-5 h-5 rounded-2xl flex items-center justify-center flex-shrink-0 hover:bg-red-100 transition-all"
                      >
                        <X size={10} style={{ color: "#8E8E93" }} />
                      </button>
                    </div>

                    {/* Person identity row */}
                    <div
                      className="flex items-center gap-2 px-2 py-1.5 rounded-2xl"
                      style={{
                        background: hasPerson
                          ? "rgba(10,126,140,0.06)"
                          : "rgba(142,142,147,0.06)",
                        border: `1px solid ${hasPerson ? "rgba(10,126,140,0.15)" : "rgba(142,142,147,0.12)"}`,
                      }}
                    >
                      {/* Face photo or initial */}
                      {hasPersonFace ? (
                        <img
                          src={`data:image/jpeg;base64,${alert.personFaceThumbnail}`}
                          alt={alert.personName}
                          className="rounded-2xl object-cover flex-shrink-0"
                          style={{
                            width: 24,
                            height: 24,
                            border: "1px solid rgba(10,126,140,0.25)",
                          }}
                        />
                      ) : (
                        <div
                          className="rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{
                            width: 24,
                            height: 24,
                            background: hasPerson
                              ? "rgba(10,126,140,0.12)"
                              : "rgba(142,142,147,0.1)",
                          }}
                        >
                          {hasPerson ? (
                            <span className="text-[11px] font-black text-brand-primary">
                              {alert.personName!.charAt(0).toUpperCase()}
                            </span>
                          ) : (
                            <User
                              size={11}
                              style={{ color: "var(--brand-muted)" }}
                              strokeWidth={2}
                            />
                          )}
                        </div>
                      )}
                      <span
                        className={`text-[10px] font-bold truncate flex-1 ${hasPerson ? "text-brand-primary" : "text-slate-400"}`}
                      >
                        {alert.personName ?? "Unknown Person"}
                      </span>
                      {/* Acknowledge button */}
                      {!isAcked && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          aria-label="Acknowledge alert"
                          className="w-5 h-5 rounded-2xl flex items-center justify-center flex-shrink-0 hover:bg-green-100 transition-all"
                          style={{ border: "1px solid rgba(40,167,69,0.3)" }}
                          title="Acknowledge"
                        >
                          <Check
                            size={10}
                            style={{ color: "#28a745" }}
                            strokeWidth={2.5}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* View all */}
              <Link
                href="/admin/alerts"
                className="flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold transition-all hover:bg-red-50"
                style={{
                  color: "#d93a3a",
                  borderTop: "1px solid rgba(217,58,58,0.1)",
                }}
              >
                <ExternalLink size={10} strokeWidth={2.5} />
                View All Alerts
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* If no alerts: fill remaining space */}
      {visibleAlerts.length === 0 && <div className="flex-1" />}

      {/* Divider */}
      <div
        className="mx-4 flex-shrink-0"
        style={{ height: 1, background: divider }}
      />

      {/* Ops Dashboard link */}
      <div className="px-2 py-2 flex-shrink-0">
        <Link
          href="/dashboard"
          title={minimized ? "Ops Dashboard" : undefined}
          className="flex items-center py-2 rounded-2xl text-sm font-semibold transition-all duration-300 ease-in-out group"
          style={{
            color: btnText,
            paddingLeft: minimized ? "23.5px" : "12px",
            paddingRight: minimized ? "0px" : "12px",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = btnHoverBg;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <MonitorPlay
            size={17}
            strokeWidth={2}
            style={{ color: btnText }}
            className="flex-shrink-0"
          />
          <span
            className={`transition-all duration-300 ease-in-out origin-left whitespace-nowrap overflow-hidden ${minimized ? "opacity-0 w-0 ml-0 scale-x-50 pointer-events-none" : "opacity-100 w-[120px] ml-3 scale-x-100"}`}
          >
            Ops Dashboard
          </span>
        </Link>
      </div>

      {/* Divider */}
      <div
        className="mx-4 flex-shrink-0"
        style={{ height: 1, background: divider }}
      />

      {/* Collapse Toggle Button at the bottom */}
      {onToggle && (
        <div className="px-2 py-2 flex-shrink-0">
          <button
            onClick={onToggle}
            aria-label={minimized ? "Expand sidebar" : "Minimize sidebar"}
            className="flex items-center w-full py-2 rounded-2xl text-sm font-semibold transition-all duration-300 ease-in-out group"
            style={{
              color: txtSec,
              paddingLeft: minimized ? "23.5px" : "12px",
              paddingRight: minimized ? "0px" : "12px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = hoverBg;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <div className="transition-all duration-300 ease-in-out transform group-hover:scale-110 group-active:scale-95 flex-shrink-0">
              {minimized ? (
                <PanelLeftOpen size={17} style={{ color: txtSec }} />
              ) : (
                <PanelLeftClose size={17} style={{ color: txtSec }} />
              )}
            </div>
            <span
              className={`transition-all duration-300 ease-in-out origin-left whitespace-nowrap overflow-hidden ${minimized ? "opacity-0 w-0 ml-0 scale-x-50 pointer-events-none" : "opacity-100 w-[120px] ml-3 scale-x-100"}`}
            >
              Close Sidebar
            </span>
          </button>
        </div>
      )}

      {/* Divider if toggle button is present */}
      {onToggle && (
        <div
          className="mx-4 flex-shrink-0"
          style={{ height: 1, background: divider }}
        />
      )}

      {/* Footer */}
      {/* {!minimized && (
        <div className="px-5 py-4 flex-shrink-0">
          <p className="text-xs" style={{ color: txtSec }}>MITS v1.0 · Active</p>
        </div>
      )} */}
    </aside>
  );
}
