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
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");

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
      doc.text(`${logs.length} dive${logs.length !== 1 ? "s" : ""} logged`, W / 2, 65, { align: "center" });

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(11);
      doc.text(`Exported ${new Date().toLocaleDateString()}`, W / 2, 100, { align: "center" });

      // ── One page per dive ────────────────────────────────────────────────────
      const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

      sorted.forEach((log, i) => {
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
          coreRows.push([
            "Buddy", log.buddy ?? "—",
            "Visibility", log.visibility != null ? `${log.visibility} ft` : "—",
          ]);
        if (log.waterTemp != null || log.rating)
          coreRows.push([
            "Water Temp", log.waterTemp != null ? `${log.waterTemp}°F` : "—",
            "Rating", stars(log.rating) || "—",
          ]);
        if (log.buddyUserId)
          coreRows.push(["Buddy User ID", String(log.buddyUserId), "", ""]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc as any).autoTable({
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (doc as any).autoTable({
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (doc as any).autoTable({
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (doc as any).autoTable({
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (doc as any).autoTable({
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading || logs.length === 0}>
      {loading ? "Generating…" : "📄 Export PDF"}
    </Button>
  );
}
