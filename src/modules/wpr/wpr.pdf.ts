import fs from "fs";
import path from "path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { RfiRow, ScheduleRow, DisplayCoRow, cleanHtmlText, resolveScheduleStatusLabel } from "./wpr.transform";
import { formatLongDate, formatNumericDate, WPR_TIMEZONE } from "./wpr.weeks";

/**
 * Node port of the FE's exportToPDF (WorkProgressReport.tsx:1449-1704).
 * Same libraries/versions as the FE (jspdf ^4.2.1, jspdf-autotable
 * ^5.0.8), same layout, same colors/sizes. The one unavoidable adaptation:
 * the FE loads the logo via `window.Image` + `pdf.addImage(logoImg, ...)`;
 * here it's read from disk once, cached as a base64 PNG, and its pixel
 * size is read straight from the PNG header (no DOM/canvas available).
 */

/**
 * FORM NO / VERSION / EFF DATE in the FE's exportToPDF title block are
 * hardcoded literals in the autoTable body (WorkProgressReport.tsx:1500-1509)
 * — NOT the dynamic, week-number-derived `formNo`/`version`/`effDate` state
 * that the on-screen header and Excel export use. Every exported PDF shows
 * the same three values regardless of which week was selected. Matched here
 * exactly; do not derive these from the week number.
 */
export const WPR_TITLE_BLOCK_DEFAULTS = {
  FORM_NO: "WBT/PMO/WPR-001",
  VERSION: "1.0",
  EFF_DATE: "05/09/2024",
} as const;

export interface WprReportMeta {
  weekEnding: string; // already formatted, e.g. "September 28, 2025"
  formNo: string;
  version: string;
  effDate: string; // already formatted, e.g. "09/28/2025"
  customer: string;
  projectName: string;
  fabProjectManager: string;
  wbtProjectManager: string;
  reportCirculatedToFab: string;
  reportCirculatedToWbt: string;
  software: string;
  projectAwarded: string;
  approvalDate: string;
  fabReleasedDate: string;
}

export interface WprAssembledReport {
  meta: WprReportMeta;
  rfi: RfiRow[];
  schedule: ScheduleRow[];
  changeOrders: DisplayCoRow[];
}

export interface ReportMetaProjectInput {
  fabricator?: { fabName?: string | null } | null;
  name?: string | null;
  manager?: { firstName?: string | null; lastName?: string | null } | null;
  tools?: string | null;
  startDate?: Date | string | null;
  approvalDate?: Date | string | null;
  fabricationDate?: Date | string | null;
}

export interface ReportMetaCirculatedToInput {
  fabProjectManager: string;
  fabCirculatedTo: string;
  wbtCirculatedTo: string;
}

/**
 * Pure: assembles the title-block meta object fed into both report.json and
 * generateWprPdf. Ported from the FE's exportToPDF meta table
 * (WorkProgressReport.tsx:1485-1540) — see WPR_TITLE_BLOCK_DEFAULTS above
 * for the FORM NO/VERSION/EFF DATE note, and formatNumericDate (not
 * formatSlashDate) for the non-zero-padded date fields, matching the FE's
 * bare `new Date(d).toLocaleDateString()`.
 */
export function buildReportMeta(
  project: ReportMetaProjectInput,
  weekEnding: Date,
  circulatedTo: ReportMetaCirculatedToInput,
  zone: string = WPR_TIMEZONE
): WprReportMeta {
  return {
    weekEnding: formatLongDate(weekEnding, zone),
    formNo: WPR_TITLE_BLOCK_DEFAULTS.FORM_NO,
    version: WPR_TITLE_BLOCK_DEFAULTS.VERSION,
    effDate: WPR_TITLE_BLOCK_DEFAULTS.EFF_DATE,
    customer: project.fabricator?.fabName || "—",
    projectName: project.name || "—",
    fabProjectManager: circulatedTo.fabProjectManager || "—",
    wbtProjectManager: project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : "—",
    reportCirculatedToFab: circulatedTo.fabCirculatedTo || "—",
    reportCirculatedToWbt: circulatedTo.wbtCirculatedTo || "—",
    software: project.tools || "SDS2",
    projectAwarded: project.startDate ? formatNumericDate(project.startDate, zone) : "—",
    approvalDate: project.approvalDate ? formatNumericDate(project.approvalDate, zone) : "—",
    fabReleasedDate: project.fabricationDate ? formatNumericDate(project.fabricationDate, zone) : "—",
  };
}

// ---------------------------------------------------------------------------
// Logo — loaded once, cached as a base64 data string + its PNG pixel size.
// ---------------------------------------------------------------------------

interface CachedLogo {
  base64: string; // raw base64 (no data: prefix) — what jsPDF's addImage expects
  width: number;
  height: number;
}

let cachedLogo: CachedLogo | null | undefined; // undefined = not yet attempted

function readPngDimensions(buf: Buffer): { width: number; height: number } {
  // PNG signature (8 bytes) + IHDR chunk: length(4) type(4) width(4) height(4) ...
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function resolveLogoPath(): string | null {
  const candidates = [
    // Preferred: copied next to the built output by `npm run build` (see package.json).
    path.join(__dirname, "..", "..", "assets", "wpr-logo.png"),
    // Fallback: running from source (ts-node) or if the build step's asset copy didn't run.
    path.join(process.cwd(), "src", "assets", "wpr-logo.png"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function loadLogo(): CachedLogo | null {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    const logoPath = resolveLogoPath();
    if (!logoPath) {
      console.error("[WPR] Logo not found at any known path; PDFs will render without it.");
      cachedLogo = null;
      return cachedLogo;
    }
    const buf = fs.readFileSync(logoPath);
    const { width, height } = readPngDimensions(buf);
    cachedLogo = { base64: buf.toString("base64"), width, height };
  } catch (err) {
    console.error("[WPR] Failed to load logo:", err);
    cachedLogo = null;
  }
  return cachedLogo;
}

// ---------------------------------------------------------------------------
// Filename
// ---------------------------------------------------------------------------

export function buildWprFilename(projectName: string, weekEndingIso: string): string {
  const safeName = (projectName || "Project").replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "Project";
  return `${safeName}_WPR_Report_${weekEndingIso}.pdf`;
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

export function generateWprPdf(report: WprAssembledReport): Buffer {
  const { meta, rfi, schedule, changeOrders } = report;
  const logo = loadLogo();

  const pdf = new jsPDF("l", "pt", "a4");
  const startX = 40;
  let finalY = 40;

  // ── Meta / title-block table ──────────────────────────────────────────
  autoTable(pdf, {
    startY: finalY,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5 },
    body: [
      [
        { content: "", rowSpan: 3, colSpan: 2, styles: { minCellWidth: 100 } },
        {
          content: `WEEK ENDING ${meta.weekEnding.toUpperCase()}`,
          rowSpan: 3,
          colSpan: 4,
          styles: { halign: "center", valign: "middle", fontStyle: "bold", fontSize: 12, fillColor: [230, 240, 255] },
        },
        { content: "FORM NO", styles: { fillColor: [255, 250, 230], fontSize: 6, fontStyle: "bold" } },
        { content: WPR_TITLE_BLOCK_DEFAULTS.FORM_NO, styles: { fontSize: 6 } },
      ],
      [
        { content: "VERSION", styles: { fillColor: [255, 250, 230], fontSize: 6, fontStyle: "bold" } },
        { content: WPR_TITLE_BLOCK_DEFAULTS.VERSION, styles: { fontSize: 6 } },
      ],
      [
        { content: "EFF DATE", styles: { fillColor: [255, 250, 230], fontSize: 6, fontStyle: "bold" } },
        { content: WPR_TITLE_BLOCK_DEFAULTS.EFF_DATE, styles: { fontSize: 6 } },
      ],
      [
        { content: "CUSTOMER", colSpan: 2, styles: { fontStyle: "bold", fillColor: "#bbf7d0", halign: "center", valign: "middle" } },
        { content: meta.customer || "—", colSpan: 6, styles: { valign: "middle" } },
      ],
      [
        { content: "PROJECT NAME :", colSpan: 2, styles: { fontStyle: "bold", fillColor: "#bbf7d0", halign: "center", valign: "middle" } },
        { content: meta.projectName || "—", colSpan: 2, styles: { valign: "middle" } },
        { content: "FABRICATOR PROJECT MANAGER", colSpan: 2, styles: { fontStyle: "bold", fillColor: "#bbf7d0", halign: "center", valign: "middle" } },
        { content: meta.fabProjectManager || "—", colSpan: 2, styles: { valign: "middle" } },
      ],
      [
        { content: "WBT PROJECT MANAGER", colSpan: 2, styles: { fontStyle: "bold", fillColor: "#bbf7d0", halign: "center", valign: "middle" } },
        { content: meta.wbtProjectManager || "—", colSpan: 2, styles: { valign: "middle" } },
        { content: "REPORT CIRCULATED TO", colSpan: 2, styles: { fontStyle: "bold", fillColor: "#bbf7d0", halign: "center", valign: "middle" } },
        { content: meta.reportCirculatedToFab || "—", colSpan: 2, styles: { valign: "middle" } },
      ],
      [
        { content: "REPORT CIRCULATED TO", colSpan: 2, styles: { fontStyle: "bold", fillColor: "#bbf7d0", halign: "center", valign: "middle" } },
        { content: meta.reportCirculatedToWbt || "—", colSpan: 2, styles: { valign: "middle" } },
        { content: "SOFTWARE", colSpan: 2, styles: { fontStyle: "bold", fillColor: "#bbf7d0", halign: "center", valign: "middle" } },
        { content: meta.software || "SDS2", colSpan: 2, styles: { valign: "middle" } },
      ],
      [
        { content: "PROJECT AWARDED", colSpan: 1, styles: { fontStyle: "bold", halign: "center", valign: "middle" } },
        { content: meta.projectAwarded, colSpan: 2, styles: { valign: "middle", halign: "center" } },
        { content: "APPROVAL DATE", colSpan: 1, styles: { fontStyle: "bold", halign: "center", valign: "middle" } },
        { content: meta.approvalDate, colSpan: 1, styles: { valign: "middle", halign: "center" } },
        { content: "FAB RELEASED DATE", colSpan: 2, styles: { fontStyle: "bold", halign: "center", valign: "middle" } },
        { content: meta.fabReleasedDate, colSpan: 1, styles: { valign: "middle", halign: "center" } },
      ],
    ],
    didDrawCell: (data: any) => {
      if (data.row.index === 0 && data.column.index === 0 && logo) {
        const cell = data.cell;
        const imgRatio = logo.width / logo.height;
        let drawH = 32;
        let drawW = drawH * imgRatio;
        if (drawW > cell.width - 10) {
          drawW = cell.width - 10;
          drawH = drawW / imgRatio;
        }
        if (drawH > cell.height - 10) {
          drawH = cell.height - 10;
          drawW = drawH * imgRatio;
        }
        const x = cell.x + (cell.width - drawW) / 2;
        const y = cell.y + (cell.height - drawH) / 2;
        pdf.addImage(logo.base64, "PNG", x, y, drawW, drawH);
      }
    },
  } as any);
  finalY = (pdf as any).lastAutoTable.finalY + 20;

  // ── 1. RFI STATUS OVERVIEW ────────────────────────────────────────────
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("1. RFI STATUS OVERVIEW", startX, finalY);
  finalY += 10;

  autoTable(pdf, {
    startY: finalY,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak", textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: "bold" },
    head: [["RFI No.", "Sent Date", "Customer Response", "Response Received", "Whiteboard Response", "Status"]],
    body: rfi.map((r) => [
      r.rfiNo || "—",
      r.sentDate || "—",
      cleanHtmlText(r.customerResponse) || "—",
      r.responseReceivedDate || "—",
      cleanHtmlText(r.wbtResponse) || "—",
      r.status || "—",
    ]),
  } as any);
  finalY = (pdf as any).lastAutoTable.finalY + 20;

  // ── 2. PROJECT SCHEDULE / MILESTONES ──────────────────────────────────
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("2. PROJECT SCHEDULE / MILESTONES", startX, finalY);
  finalY += 10;

  const pdfScheduleBody: any[] = [];
  schedule.forEach((s) => {
    if (Array.isArray(s.unifiedEntries) && s.unifiedEntries.length > 0) {
      s.unifiedEntries.forEach((entry) => {
        const statusLabel = resolveScheduleStatusLabel(entry.status);
        const hasNote =
          entry.notes &&
          typeof entry.notes === "string" &&
          entry.notes !== "—" &&
          entry.notes.trim() !== "" &&
          !["Waiting for BFA", "BFA Received", "100% Complete"].includes(entry.notes);

        let commentStr = statusLabel !== "—" ? statusLabel : "";
        if (hasNote) {
          const cleanedNote = cleanHtmlText(entry.notes) || "—";
          commentStr = commentStr ? `${commentStr}\n${cleanedNote}` : cleanedNote;
        }
        if (!commentStr) commentStr = "—";

        const ifaText = entry.ifaDate !== "—" ? `${entry.subject}\n${entry.ifaDate}` : "—";
        const bfaText = entry.bfaDate !== "—" ? `${entry.subject}\n${entry.bfaDate}` : "—";
        const ifcText = entry.ifcDate !== "—" ? `${entry.subject}\n${entry.ifcDate}` : "—";
        const corText = entry.corDate !== "—" ? `${entry.subject}\n${entry.corDate}` : "—";

        pdfScheduleBody.push([s.phase || "—", s.startDate || "—", ifaText, bfaText, ifcText, corText, commentStr]);
      });
    } else {
      const commentText = cleanHtmlText(s.comments) || "—";
      pdfScheduleBody.push([
        s.phase || "—",
        s.startDate || "—",
        s.ifaSubDate || "—",
        s.bfaRecdDate || "—",
        s.ifcSubDate || "—",
        s.corSubDate || "—",
        commentText || "—",
      ]);
    }
  });

  autoTable(pdf, {
    startY: finalY,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak", textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: "bold" },
    head: [["Phase / Subject", "Start Date", "IFA - Submission Date", "BFA - Recd Date", "IFC - Sub Date", "COR Drawing Submission Date", "Status & Comment"]],
    body: pdfScheduleBody,
  } as any);
  finalY = (pdf as any).lastAutoTable.finalY + 20;

  // ── 3. CHANGE ORDER AMOUNT ($) MONTHLY BREAKDOWN ──────────────────────
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("3. CHANGE ORDER AMOUNT ($) MONTHLY BREAKDOWN", startX, finalY);
  finalY += 10;

  autoTable(pdf, {
    startY: finalY,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak", textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5, halign: "center" },
    headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
    columnStyles: { 0: { halign: "left" } },
    head: [["Change Order", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "FY Total"]],
    body: changeOrders.map((c) => [
      c.changeOrder || "—",
      c.Jan || "—",
      c.Feb || "—",
      c.Mar || "—",
      c.Apr || "—",
      c.May || "—",
      c.Jun || "—",
      c.Jul || "—",
      c.Aug || "—",
      c.Sep || "—",
      c.Oct || "—",
      c.Nov || "—",
      c.Dec || "—",
      c.total || "—",
    ]),
  } as any);

  const arrayBuffer = pdf.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(arrayBuffer);
}
