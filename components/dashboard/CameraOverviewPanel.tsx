"use client";

import React from "react";
import { Camera, DetectionEvent, Alert, WatchlistEntry } from "@/types";

export function CameraOverviewPanel({
  cameras,
  recentEvents,
  allAlerts,
  watchlistData,
  C,
  expandedId,
  onExpand,
}: {
  cameras: Camera[];
  recentEvents: DetectionEvent[];
  allAlerts: Alert[];
  watchlistData: WatchlistEntry[];
  C: Record<string, string>;
  expandedId: string | null;
  onExpand: (id: string | null) => void;
}) {
  const today = new Date().toDateString();
  const todayEvents = recentEvents.filter(
    (e) => new Date(e.timestamp).toDateString() === today,
  );
  const watchlistPlates = new Set(watchlistData.map((w) => w.plateText));
  const todayHits = todayEvents.filter((e) =>
    watchlistPlates.has(e.plateText),
  ).length;
  const onlineCount = cameras.filter((c) => c.streaming).length;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div className="ops-section-title" style={{ flexShrink: 0 }}>
        CAMERA STATUS
        {/* <span style={{ marginLeft: 'auto', fontSize: 9, color: C.txt3 }}>CLICK TO EXPAND</span> */}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {cameras.length === 0 ? (
          <div
            style={{
              padding: "20px 12px",
              textAlign: "center",
              color: C.txt3,
              fontSize: 9,
              letterSpacing: "0.08em",
            }}
          >
            NO CAMERAS CONFIGURED
          </div>
        ) : (
          cameras.map((cam) => {
            const isExpanded = expandedId === cam.id;
            const camEvents = todayEvents.filter(
              (e) => e.cameraId === cam.id || e.cameraName === cam.name,
            );
            const camHits = camEvents.filter((e) =>
              watchlistPlates.has(e.plateText),
            ).length;
            const isOnline = cam.streaming;

            return (
              <div
                key={cam.id}
                style={{
                  borderBottom: `1px solid ${C.border}`,
                  borderLeft: `2px solid ${isExpanded ? C.amber : isOnline ? C.green + "55" : C.red + "33"}`,
                  background: isExpanded
                    ? "rgba(232,160,0,0.04)"
                    : "transparent",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    cursor: "pointer",
                  }}
                  onClick={() => onExpand(isExpanded ? null : cam.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.txt,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cam.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.txt3,
                        marginTop: 1,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {cam.id.slice(-8).toUpperCase()}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 3,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className={`ops-badge ${isOnline ? "badge-live" : "badge-offln"}`}
                    >
                      {isOnline ? "LIVE" : "OFFLN"}
                    </span>
                  </div>
                  {camHits > 0 && (
                    <span
                      className="ops-badge badge-alert"
                      style={{ marginLeft: 4 }}
                    >
                      {camHits} HIT{camHits > 1 ? "S" : ""}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 12,
                      color: C.txt3,
                      marginLeft: 6,
                      flexShrink: 0,
                    }}
                  >
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      background: C.bg2,
                      borderTop: `1px solid ${C.border}`,
                      padding: "8px 12px 10px",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "5px 16px",
                        marginBottom: 8,
                      }}
                    >
                      {(
                        [
                          ["ZONE", cam.zone ?? "—"],
                          ["DETECTIONS", String(camEvents.length)],
                          ["WATCHLIST HITS", String(camHits)],
                          ["STATUS", isOnline ? "ONLINE" : "OFFLINE"],
                        ] as [string, string][]
                      ).map(([k, v]) => (
                        <div key={k}>
                          <div
                            style={{
                              fontSize: 7,
                              color: C.txt3,
                              letterSpacing: "0.12em",
                              marginBottom: 2,
                            }}
                          >
                            {k}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color:
                                k === "WATCH HITS" && camHits > 0
                                  ? C.red
                                  : k === "STATUS"
                                    ? isOnline
                                      ? C.green
                                      : C.red
                                    : C.txt,
                            }}
                          >
                            {v}
                          </div>
                        </div>
                      ))}
                    </div>
                    {camEvents.length > 0 && (
                      <>
                        <div
                          style={{
                            fontSize: 7,
                            color: C.txt3,
                            letterSpacing: "0.12em",
                            marginBottom: 5,
                            paddingTop: 5,
                            borderTop: `1px solid ${C.border}`,
                          }}
                        >
                          RECENT DETECTIONS
                        </div>
                        {camEvents.slice(0, 4).map((e, i) => (
                          <div
                            key={e.id ?? i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                              padding: "4px 0",
                              borderTop:
                                i === 0
                                  ? "none"
                                  : `1px solid ${C.border + "66"}`,
                            }}
                          >
                            {e.thumbnailBase64 && (
                              <img
                                src={`data:image/jpeg;base64,${e.thumbnailBase64}`}
                                alt=""
                                style={{
                                  width: 48,
                                  height: 30,
                                  objectFit: "cover",
                                  flexShrink: 0,
                                  border: `1px solid ${C.border}`,
                                }}
                              />
                            )}
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 800,
                                color: watchlistPlates.has(e.plateText)
                                  ? C.red
                                  : C.amber,
                                letterSpacing: "0.1em",
                                flex: 1,
                              }}
                            >
                              {e.plateText}
                            </span>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                gap: 1,
                                flexShrink: 0,
                              }}
                            >
                              <span style={{ fontSize: 12, color: C.txt3 }}>
                                {Math.round(e.confidence * 100)}%
                              </span>
                              <span style={{ fontSize: 7, color: C.txt3 }}>
                                {new Date(e.timestamp).toLocaleTimeString(
                                  "en-PK",
                                  { hour12: false },
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
