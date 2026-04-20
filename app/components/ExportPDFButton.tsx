"use client";

import { useState } from "react";
import { Button } from "@/components/ui/form";
import { type DiveLog } from "@/app/api/logs/data";
import { type PublicUser } from "@/app/types/user";

function formatDate(dateStr: string): string {
  const d = dateStr.split("T")[0];
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y}`;
}

function stars(n?: number): string {
  if (!n) return "";
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export default function ExportPDFButton({ user, logs }: { user: PublicUser; logs: DiveLog[] }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const allSelected = logs.length > 0 && selectedIds.size === logs.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const openModal = () => {
    setSelectedIds(new Set());
    setShowModal(true);
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(logs.map((l) => l.id)));
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    const toExport = sorted.filter((l) => selectedIds.has(l.id));
    setLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210;
      const BLUE = [21, 101, 192] as [number, number, number];
      const LIGHT_BLUE = [227, 242, 253] as [number, number, number];

      // ── Cover page ──────────────────────────────────────────────────────────
      doc.setFillColor(...BLUE);
      doc.rect(0, 0, W, 80, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont("helvetica", "bold");
      doc.text("Dive Logbook", W / 2, 35, { align: "center" });

      doc.setFontSize(18);
      doc.setFont("helvetica", "normal");
      doc.text(`${user.firstName} ${user.lastName}`, W / 2, 52, { align: "center" });

      doc.setFontSize(13);
      doc.text(`${toExport.length} dive${toExport.length !== 1 ? "s" : ""} logged`, W / 2, 65, { align: "center" });

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(11);
      doc.text(`Exported ${new Date().toLocaleDateString()}`, W / 2, 100, { align: "center" });

      // ── One page per dive ────────────────────────────────────────────────────
      toExport.forEach((log, i) => {
        doc.addPage();

        // Header bar
        doc.setFillColor(...BLUE);
        doc.rect(0, 0, W, 22, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(`Dive #${i + 1}  •  ${log.location}`, 14, 10);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(formatDate(log.date), 14, 17);
        if (log.diveType) doc.text(log.diveType, W - 14, 17, { align: "right" });

        let y = 30;

        // Core info table
        const coreRows: [string, string, string, string][] = [];
        coreRows.push(["Depth", `${log.depth} ft`, "Duration", `${log.duration} min`]);
        if (log.buddy || log.visibility != null)
          coreRows.push(["Buddy", log.buddy ?? "—", "Visibility", log.visibility != null ? `${log.visibility} ft` : "—"]);
        if (log.waterTemp != null || log.rating)
          coreRows.push(["Water Temp", log.waterTemp != null ? `${log.waterTemp}°F` : "—", "Rating", stars(log.rating) || "—"]);

        autoTable(doc, {
          startY: y,
          head: [["Dive Info", "", "", ""]],
          body: coreRows,
          theme: "grid",
          headStyles: { fillColor: BLUE, textColor: 255, fontStyle: "bold", fontSize: 10 },
          bodyStyles: { fontSize: 10, textColor: [30, 30, 30] },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 35, fillColor: LIGHT_BLUE },
            1: { cellWidth: 55 },
            2: { fontStyle: "bold", cellWidth: 35, fillColor: LIGHT_BLUE },
            3: { cellWidth: 55 },
          },
          margin: { left: 14, right: 14 },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 6;

        // Tank & Gear
        const gearRows: [string, string, string, string][] = [];
        if (log.tankStart != null || log.tankEnd != null)
          gearRows.push(["Tank Start", log.tankStart != null ? `${log.tankStart} PSI` : "—", "Tank End", log.tankEnd != null ? `${log.tankEnd} PSI` : "—"]);
        if (log.gasMix || log.o2Percent != null)
          gearRows.push(["Gas Mix", log.gasMix ?? "—", "O₂ %", log.o2Percent != null ? `${log.o2Percent}%` : "—"]);
        if (log.cylinderType || log.cylinderSize != null)
          gearRows.push(["Cylinder Type", log.cylinderType ?? "—", "Cylinder Size", log.cylinderSize != null ? `${log.cylinderSize} L` : "—"]);
        if (log.wetsuit || log.bcd)
          gearRows.push(["Wetsuit", log.wetsuit ?? "—", "BCD", log.bcd ?? "—"]);
        if (log.fins)
          gearRows.push(["Fins", log.fins, "", ""]);
        if (log.certUsed)
          gearRows.push(["Cert Used", log.certUsed, "", ""]);

        if (gearRows.length > 0) {
          autoTable(doc, {
            startY: y,
            head: [["Tank & Gear", "", "", ""]],
            body: gearRows,
            theme: "grid",
            headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: "bold", fontSize: 10 },
            bodyStyles: { fontSize: 10, textColor: [30, 30, 30] },
            columnStyles: {
              0: { fontStyle: "bold", cellWidth: 35, fillColor: LIGHT_BLUE },
              1: { cellWidth: 55 },
              2: { fontStyle: "bold", cellWidth: 35, fillColor: LIGHT_BLUE },
              3: { cellWidth: 55 },
            },
            margin: { left: 14, right: 14 },
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          y = (doc as any).lastAutoTable.finalY + 6;
        }

        // Marine life
        if (log.marineLife) {
          autoTable(doc, {
            startY: y,
            head: [["Marine Life Spotted"]],
            body: [[log.marineLife]],
            theme: "grid",
            headStyles: { fillColor: [46, 125, 50], textColor: 255, fontStyle: "bold", fontSize: 10 },
            bodyStyles: { fontSize: 10, textColor: [30, 30, 30] },
            margin: { left: 14, right: 14 },
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          y = (doc as any).lastAutoTable.finalY + 6;
        }

        // Lat/Lng
        if (log.lat != null && log.lng != null) {
          autoTable(doc, {
            startY: y,
            head: [["GPS Coordinates", ""]],
            body: [["Latitude / Longitude", `${log.lat}, ${log.lng}`]],
            theme: "grid",
            headStyles: { fillColor: BLUE, textColor: 255, fontStyle: "bold", fontSize: 10 },
            bodyStyles: { fontSize: 10, textColor: [30, 30, 30] },
            columnStyles: {
              0: { fontStyle: "bold", cellWidth: 50, fillColor: LIGHT_BLUE },
              1: {},
            },
            margin: { left: 14, right: 14 },
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          y = (doc as any).lastAutoTable.finalY + 6;
        }

        // Notes
        if (log.notes) {
          autoTable(doc, {
            startY: y,
            head: [["Notes"]],
            body: [[log.notes]],
            theme: "grid",
            headStyles: { fillColor: [96, 125, 139], textColor: 255, fontStyle: "bold", fontSize: 10 },
            bodyStyles: { fontSize: 10, textColor: [30, 30, 30] },
            margin: { left: 14, right: 14 },
          });
        }

        // Page footer
        doc.setTextColor(180, 180, 180);
        doc.setFontSize(8);
        doc.text(`${user.firstName} ${user.lastName}  •  Dive Log`, W / 2, 290, { align: "center" });
      });

      doc.save(`dive-logbook-${user.firstName.toLowerCase()}-${user.lastName.toLowerCase()}.pdf`);
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={openModal} disabled={logs.length === 0}>
        📄 Export PDF
      </Button>

      {showModal && (
        <div
          onClick={() => !loading && setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 500,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 12,
              width: "100%",
              maxWidth: 520,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "85vh",
            }}
          >
            {/* Modal header */}
            <div style={{ padding: "20px 24px 0" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 18, color: "#1565c0" }}>
                Select Dives to Export
              </h2>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#666" }}>
                {selectedIds.size === 0
                  ? "No dives selected"
                  : `${selectedIds.size} of ${logs.length} selected`}
              </p>

              {/* Select all row */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "#f0f4f8",
                  cursor: "pointer",
                  marginBottom: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#333",
                }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#1565c0" }}
                />
                Select All ({logs.length} dive{logs.length !== 1 ? "s" : ""})
              </label>
            </div>

            {/* Scrollable dive list */}
            <div style={{ overflowY: "auto", flex: 1, padding: "0 24px 8px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {sorted.map((log) => {
                  const checked = selectedIds.has(log.id);
                  return (
                    <label
                      key={log.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: `1px solid ${checked ? "#1565c0" : "#e0e0e0"}`,
                        background: checked ? "#e3f2fd" : "white",
                        cursor: "pointer",
                        transition: "background 0.1s, border-color 0.1s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(log.id)}
                        style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#1565c0", flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#222", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {log.location}
                        </div>
                        <div style={{ fontSize: 12, color: "#666", marginTop: 1 }}>
                          {formatDate(log.date)} · {log.depth} ft · {log.duration} min
                          {log.diveType ? ` · ${log.diveType}` : ""}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Footer actions */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #eee",
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                flexShrink: 0,
              }}
            >
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={selectedIds.size === 0 || loading}
              >
                {loading ? "Generating…" : `📄 Export PDF (${selectedIds.size})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
