import { formatNumericDate, WPR_TIMEZONE } from "./wpr.weeks";

/**
 * Pure transform functions ported from ProjectStation-PWA's
 * wpr/WorkProgressReport.tsx. No DB access, no Express, no I/O.
 *
 * Porting rule for this phase: replicate the FE's math/grouping/filtering
 * EXACTLY, including its quirks (see wpr_audit — "no hours math", the
 * cumulative isUpToWeek filter, the merge-by-phase-name logic, etc). Two
 * browser-only primitives have no Node equivalent and are the only
 * intentional adaptations:
 *   - DOMParser-based cleanHtmlText -> pure-string cleanHtmlText below
 *     (see its own doc comment for the one documented behavior delta)
 *   - window.Image / pdf.addImage(logoImg) -> handled in wpr.pdf.ts, not here
 */

// ---------------------------------------------------------------------------
// Output row shapes
// ---------------------------------------------------------------------------

export interface RfiRow {
  id: string;
  rfiNo: string;
  sentDate: string;
  customerResponse: string;
  responseReceivedDate: string;
  wbtResponse: string;
  status: string;
  createdAt: string | null;
}

export interface ScheduleEntry {
  id: string;
  subject: string;
  ifaDate: string;
  bfaDate: string;
  ifcDate: string;
  corDate: string;
  status: string;
  date: string | number | Date;
  notes: string;
}

export interface ScheduleRow {
  id: string;
  phase: string;
  startDate: string;
  unifiedEntries: ScheduleEntry[];
  bfaRecdDate: string;
  submittalStatus: string;
  ifaSubDate: string;
  ifcSubDate: string;
  corSubDate: string;
  comments: string;
  types: string;
  subSubject: string;
}

export interface CoRow {
  id: string;
  createdAt: string;
  changeOrder: string;
  [month: string]: any; // Jan..Dec -> "$1,234" | "SENT" | "—"
  total: string;
}

export interface DisplayCoRow {
  id: string;
  changeOrder: string;
  [month: string]: any;
  total: string;
}

/** Minimal shape needed from a pre-fetched BFA record for a submittal. */
export interface BfaCacheEntry {
  status?: string | null;
  createdAt?: string | Date | null;
  date?: string | Date | null;
}
export type BfaCache = Record<string, BfaCacheEntry>;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

/**
 * Pure-string replacement for the FE's DOMParser-based cleanHtmlText.
 * Output rules (fixed for this phase, applied unconditionally — the FE had
 * a "no tags present" fast path that skipped &nbsp; decoding; this version
 * always decodes entities, which is a deliberate, documented difference —
 * see wpr_audit report item 10e):
 *   <br> -> \n ; closing p/div/li -> \n ; <li> -> "• " ; &nbsp; -> space ;
 *   strip remaining tags ; decode common entities ; trim ;
 *   collapse 3+ newlines to 2.
 * Returns "" for falsy input — callers append `|| "—"` where the FE did.
 */
export function cleanHtmlText(html: unknown): string {
  if (!html) return "";
  let text = String(html);
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>|<\/div>|<\/li>/gi, "\n");
  text = text.replace(/<li>/gi, "• ");
  text = text.replace(/&nbsp;/gi, " ");
  text = text.replace(/<[^>]+>/g, ""); // strip remaining tags
  text = text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/gi, (m) => HTML_ENTITIES[m.toLowerCase()] ?? m);
  text = text.trim().replace(/\n{3,}/g, "\n\n");
  return text;
}

/** Ported verbatim from the FE's RFI extractText: simple tag strip, no entity decoding. */
export function extractText(res: any): string {
  return String(res?.reason || res?.description || "").replace(/<[^>]+>/g, "").trim();
}

/** Isolated currency formatter — the FE's Number(...).toLocaleString(), no fixed decimals. Change here only. */
export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

/** `${firstName} ${lastName}`.trim().toUpperCase(), comma-joined — ported from the FE's POC/PM name formatting. */
export function joinNames(users: any[]): string {
  return (users || []).map((u) => formatCirculatedName(u)).join(", ");
}

/** `${firstName} ${lastName}`.trim().toUpperCase() for a single user. */
export function formatCirculatedName(user: any): string {
  return `${user?.firstName || ""} ${user?.lastName || ""}`.trim().toUpperCase();
}

const fmt = (d: any, zone: string): string => (d ? formatNumericDate(d, zone) : "—");

// ---------------------------------------------------------------------------
// 1. RFI transform — ported from WorkProgressReport.tsx lines 284-406
// ---------------------------------------------------------------------------

function flattenResponses(list: any[]): any[] {
  const flat: any[] = [];
  (list || []).forEach((res) => {
    flat.push(res);
    if (res?.childResponses && res.childResponses.length > 0) {
      flat.push(...flattenResponses(res.childResponses));
    }
  });
  return flat;
}

function isClientResponse(res: any, rfi: any): boolean {
  const role = String(res.user?.role || res.userRole || res.createdByRole || "").toUpperCase();
  if (role.includes("CLIENT")) return true;

  const wbtStatusUpper = String(res.wbtStatus || "").toUpperCase();
  if (wbtStatusUpper === "RECEIVED") return true;

  const responderId = res.userId || res.user?.id || res.user?._id;
  if (responderId) {
    const responderIdStr = String(responderId).toLowerCase();
    const recepId = String(rfi.recepient_id || rfi.recipient_id || rfi.recepients || "").toLowerCase();
    if (recepId && recepId === responderIdStr) return true;

    const recipients = rfi.multipleRecipients || [];
    if (recipients.some((rep: any) => String(rep.id || rep._id || "").toLowerCase() === responderIdStr)) {
      return true;
    }
  }
  return false;
}

function getRfiSortKey(item: RfiRow) {
  const rfiStr = item.rfiNo || (item as any).rfiNumber || (item as any).rfi_number || (item as any).rfiCode || "";
  const match = String(rfiStr).match(/RFI\s*#?\s*(\d+)(.*)/i);
  if (match) return { num: parseInt(match[1], 10), suffix: match[2] || "", raw: rfiStr };
  const numMatch = String(rfiStr).match(/(\d+)/);
  if (numMatch) return { num: parseInt(numMatch[1], 10), suffix: "", raw: rfiStr };
  return { num: Number.MAX_SAFE_INTEGER, suffix: "", raw: rfiStr };
}

function compareRfisByNo(a: RfiRow, b: RfiRow): number {
  const keyA = getRfiSortKey(a);
  const keyB = getRfiSortKey(b);
  if (keyA.num !== keyB.num) return keyA.num - keyB.num;
  return keyA.raw.localeCompare(keyB.raw, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Build RFI rows from raw RFI data (whatever shape the RFI service returns:
 * a bare array, {data: [...]}, or {"show rfi": [...]}, mirroring the FE's
 * own defensive unwrapping).
 */
export function buildRfiRows(rfiData: any, zone: string = WPR_TIMEZONE): RfiRow[] {
  let rfiArray: any[] = [];
  if (Array.isArray(rfiData)) rfiArray = rfiData;
  else if (rfiData && rfiData.data) rfiArray = rfiData.data;
  else if (rfiData && rfiData["show rfi"]) rfiArray = rfiData["show rfi"];

  // Hide connection design RFIs
  rfiArray = rfiArray.filter((r) => !(r.isConnectionDesign === true || String(r.isConnectionDesign).toLowerCase() === "true"));

  const formattedRFIs: RfiRow[] = rfiArray.map((r, index) => {
    const responses = flattenResponses(r.rfiresponse || []);

    const sorted = [...responses].sort(
      (a, b) => new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime()
    );

    const customerRep =
      [...sorted].reverse().find((res) => isClientResponse(res, r)) ||
      sorted.find((res) => res.responseState === "SENT" && !isClientResponse(res, r));

    const wbtRep = [...sorted].reverse().find((res) => !isClientResponse(res, r));

    let statusLabel = "PENDING";
    if (sorted.length > 0) {
      const latest = sorted[sorted.length - 1];
      const rfiStatus = latest.wbtStatus || latest.status;
      if (rfiStatus && typeof rfiStatus === "string") statusLabel = rfiStatus.toUpperCase();
    } else {
      statusLabel = r.status === true || r.status === "OPEN" || r.status === "PENDING" ? "PENDING" : "ANSWERED";
    }

    return {
      id: r.id || r._id,
      rfiNo: r.subject || r.serialNo || `RFI #${index + 1}`,
      sentDate: r.date ? fmt(r.date, zone) : "—",
      customerResponse: customerRep ? extractText(customerRep) || "(no text)" : "Waiting...",
      responseReceivedDate: customerRep ? fmt(customerRep.createdAt || customerRep.date, zone) : "—",
      wbtResponse: wbtRep ? extractText(wbtRep) || "Responded" : "—",
      status: statusLabel,
      createdAt: r.createdAt || r.date || null,
    };
  });

  formattedRFIs.sort(compareRfisByNo);
  return formattedRFIs;
}

// ---------------------------------------------------------------------------
// 2. Schedule transform — ported from lines 409-719
// ---------------------------------------------------------------------------

const isIfa = (s: any): boolean => {
  const stage = String(s?.stage || "").toUpperCase();
  const subject = String(s?.subject || s?.serialNo || "").toUpperCase();
  return stage.includes("IFA") || subject.includes("IFA");
};
const isIfc = (s: any): boolean => {
  const stage = String(s?.stage || "").toUpperCase();
  const subject = String(s?.subject || s?.serialNo || "").toUpperCase();
  return stage.includes("IFC") || subject.includes("IFC");
};
const isCor = (s: any): boolean => {
  const stage = String(s?.stage || "").toUpperCase();
  const subject = String(s?.subject || s?.serialNo || "").toUpperCase();
  return stage.includes("COR") || stage === "CO" || subject.includes("COR") || subject.includes("CO ");
};

function bfaCacheKeyFor(sub: any): string {
  return String(sub.id || sub._id);
}

/**
 * Build schedule rows from milestones + submittals + a pre-fetched BFA
 * cache (keyed by submittal id, for submittals with bfaStatus===true &&
 * status==="BFA_SENT" — the repository layer is responsible for deciding
 * which submittals qualify and fetching those, in bounded batches).
 */
export function buildScheduleRows(
  milestones: any[],
  submittalData: any[],
  project: any,
  bfaCache: BfaCache,
  zone: string = WPR_TIMEZONE
): ScheduleRow[] {
  const filteredSubmittalData = (submittalData || []).filter(
    (sub) => !(sub.isConnectionDesign === true || String(sub.isConnectionDesign).toLowerCase() === "true")
  );

  const linkedSubmittalIds = new Set<string>();
  const toEntry = (sub: any) => ({ subject: sub.subject || sub.serialNo || "—", date: fmt(sub.date || sub.createdAt, zone) });

  // ── Milestone rows ──────────────────────────────────────────────────────
  const milestoneRows = (milestones || []).map((m: any) => {
    const mId = String(m.id || m._id);

    const matchLink = (link: any) =>
      String(link) === mId || String(link?.id) === mId || String(link?.mileStoneId) === mId || String(link?.milestoneId) === mId;

    const belongsToMilestone = (sub: any) => {
      if (String(sub.mileStoneId || sub.milestoneId || sub.milestone?.id) === mId) return true;
      if (Array.isArray(sub.mileStoneIds) && sub.mileStoneIds.some(matchLink)) return true;
      if (Array.isArray(sub.mileStoneLinks) && sub.mileStoneLinks.some(matchLink)) return true;
      return false;
    };

    const subs = filteredSubmittalData.filter(belongsToMilestone);
    subs.forEach((s: any) => linkedSubmittalIds.add(String(s.id || s._id)));

    const unifiedEntries: ScheduleEntry[] = subs.map((s: any) => {
      const dateStr = s.createdAt || s.date || 0;

      let bfaDate = "—";
      const resList = s.submittalsResponse || [];
      if (resList.length > 0) {
        const latest = [...resList].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
        if (latest && latest.createdAt) bfaDate = fmt(latest.createdAt, zone);
      }
      const cached = bfaCache[bfaCacheKeyFor(s)];
      if (s.bfaStatus === true && s.status === "BFA_SENT" && cached) {
        const bDate = cached.createdAt || cached.date;
        if (bDate) bfaDate = fmt(bDate, zone);
      }

      let currentStatus = s.wbtStatus || s.status || "PENDING";
      if (cached && cached.status) currentStatus = cached.status;
      if (isIfc(s)) currentStatus = "100% COMPLETE";

      return {
        id: s.id || s._id,
        subject: s.subject || s.serialNo || "—",
        ifaDate: isIfa(s) ? fmt(dateStr, zone) : "—",
        bfaDate,
        ifcDate: isIfc(s) ? fmt(dateStr, zone) : "—",
        corDate: isCor(s) ? fmt(dateStr, zone) : "—",
        status: currentStatus,
        date: dateStr,
        notes: cleanHtmlText(s.notes || ""),
      };
    });

    const finalBfaRecdDate = unifiedEntries.find((e) => e.bfaDate !== "—")?.bfaDate || "—";
    const primarySub =
      subs.length > 0
        ? [...subs].sort((a: any, b: any) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime())[0]
        : null;
    const submittalStatus = primarySub ? primarySub.wbtStatus || primarySub.status || "PENDING" : "—";

    const comments = (() => {
      if (subs.length === 0) {
        const flattenMilestoneResponses = (list: any): any[] => {
          if (!Array.isArray(list)) return [];
          const flat: any[] = [];
          for (const res of list) {
            if (res) {
              flat.push(res);
              if (Array.isArray(res.childResponses)) flat.push(...flattenMilestoneResponses(res.childResponses));
            }
          }
          return flat;
        };
        const safeVersions = Array.isArray(m.versions) ? m.versions : m.currentVersion ? [m.currentVersion] : [];
        const allMilestoneResponses = safeVersions.flatMap((v: any) => flattenMilestoneResponses(v?.responses || []));
        const sortedMilestoneResponses = [...allMilestoneResponses].sort(
          (a: any, b: any) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime()
        );
        const latestMilestoneResponse = sortedMilestoneResponses[0] || null;
        if (latestMilestoneResponse) {
          const desc = cleanHtmlText(latestMilestoneResponse.description);
          const words = desc.split(/\s+/).filter(Boolean);
          return words.slice(0, 10).join(" ") + (words.length > 10 ? "..." : "");
        }
        return "—";
      } else {
        const subNotesList = subs
          .map((sb: any) => cleanHtmlText(sb.notes))
          .filter((n: any) => typeof n === "string" && n.trim() !== "" && n !== "—");
        return subNotesList.length > 0 ? subNotesList.join(" | ") : "—";
      }
    })();

    return {
      id: m.id || m._id,
      _type: "milestone" as const,
      phase: m.subject || "Unnamed Phase",
      startDate: m.date ? fmt(m.date, zone) : project?.startDate ? fmt(project.startDate, zone) : "—",
      unifiedEntries,
      bfaRecdDate: finalBfaRecdDate,
      submittalStatus,
      ifaSubDate: unifiedEntries.find((e) => e.ifaDate !== "—")?.ifaDate || "—",
      ifcSubDate: unifiedEntries.find((e) => e.ifcDate !== "—")?.ifcDate || "—",
      corSubDate: unifiedEntries.find((e) => e.corDate !== "—")?.corDate || "—",
      comments,
      types: m.types || "ANCHOR_BOLT",
      subSubject: m.subSubject || "",
    };
  });

  // ── Standalone submittal rows (no milestone link of any kind) ────────────
  const standaloneRows = filteredSubmittalData
    .filter((sub: any) => {
      if (linkedSubmittalIds.has(String(sub.id || sub._id))) return false;
      if (sub.mileStoneId || sub.milestoneId) return false;
      if (sub.mileStoneIds && sub.mileStoneIds.length > 0) return false;
      if (sub.mileStoneLinks && sub.mileStoneLinks.length > 0) return false;
      return true;
    })
    .map((sub: any) => {
      const responses = sub.submittalsResponse || [];
      const latestResponse = [...responses].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];

      let finalBfaRecdDate = latestResponse ? fmt(latestResponse.createdAt || latestResponse.respondedAt, zone) : "—";
      const cached = bfaCache[bfaCacheKeyFor(sub)];
      if (sub.bfaStatus === true && sub.status === "BFA_SENT" && cached) {
        const dateStr = cached.createdAt || cached.date;
        if (dateStr) finalBfaRecdDate = fmt(dateStr, zone);
      }

      let currentStatus = sub.wbtStatus || sub.status || "PENDING";
      if (cached && cached.status) currentStatus = cached.status;
      if (isIfc(sub)) currentStatus = "100% COMPLETE";

      const dateStr = sub.createdAt || sub.date || 0;
      const unifiedEntries: ScheduleEntry[] = [
        {
          id: sub.id || sub._id,
          subject: sub.subject || sub.serialNo || "—",
          ifaDate: isIfa(sub) ? fmt(dateStr, zone) : "—",
          bfaDate: finalBfaRecdDate,
          ifcDate: isIfc(sub) ? fmt(dateStr, zone) : "—",
          corDate: isCor(sub) ? fmt(dateStr, zone) : "—",
          status: currentStatus,
          date: dateStr,
          notes: cleanHtmlText(sub.notes || ""),
        },
      ];

      const entry = toEntry(sub);

      return {
        id: sub.id || sub._id,
        _type: "submittal" as const,
        phase: sub.subject || sub.serialNo || "Unnamed Submittal",
        startDate: fmt(sub.date || sub.createdAt, zone),
        unifiedEntries,
        bfaRecdDate: finalBfaRecdDate,
        ifaSubDate: isIfa(sub) ? entry.date : "—",
        ifcSubDate: isIfc(sub) ? entry.date : "—",
        corSubDate: isCor(sub) ? entry.date : "—",
        submittalStatus: sub.wbtStatus || sub.status || "PENDING",
        comments: cleanHtmlText(sub.notes) || "—",
        types: "ANCHOR_BOLT",
        subSubject: sub.subject || sub.serialNo || "",
      };
    });

  // ── Merge rows that share the same Phase / Subject ────────────────────────
  const sortByDate = (entries: ScheduleEntry[]) =>
    [...entries].sort((a, b) => {
      const da = a.date && a.date !== "—" ? new Date(a.date).getTime() : new Date(0).getTime();
      const db = b.date && b.date !== "—" ? new Date(b.date).getTime() : new Date(0).getTime();
      return da - db;
    });

  const mergeMap = new Map<string, any>();
  [...milestoneRows, ...standaloneRows].forEach((row: any) => {
    const key = (row.phase || "").trim().toUpperCase();
    if (!mergeMap.has(key)) {
      mergeMap.set(key, { ...row, unifiedEntries: [...(row.unifiedEntries || [])] });
    } else {
      const base = mergeMap.get(key);
      base.unifiedEntries.push(...(row.unifiedEntries || []));
      if (row.startDate && row.startDate !== "—" && (base.startDate === "—" || new Date(row.startDate) < new Date(base.startDate))) {
        base.startDate = row.startDate;
      }
      if (row.bfaRecdDate && row.bfaRecdDate !== "—") {
        if (base.bfaRecdDate === "—" || new Date(row.bfaRecdDate) > new Date(base.bfaRecdDate)) {
          base.bfaRecdDate = row.bfaRecdDate;
        }
      }
      if (row.submittalStatus && row.submittalStatus !== "—") {
        base.submittalStatus = row.submittalStatus;
      }
      if (row.comments && row.comments !== "—") {
        base.comments = base.comments === "—" ? row.comments : base.comments.includes(row.comments) ? base.comments : `${base.comments} | ${row.comments}`;
      }
    }
  });

  const mergedRows: ScheduleRow[] = Array.from(mergeMap.values()).map((row: any) => {
    const sortedEntries = sortByDate(row.unifiedEntries || []);
    const ifcSubDate = sortedEntries.find((e) => e.ifcDate !== "—")?.ifcDate || "—";
    const hasSubNotes = row.comments && row.comments !== "—" && row.comments !== "100% Complete";
    let finalComment = row.comments;
    if (ifcSubDate !== "—") {
      finalComment = hasSubNotes ? `100% Complete | ${row.comments}` : "100% Complete";
    }
    return {
      ...row,
      unifiedEntries: sortedEntries,
      ifaSubDate: sortedEntries.find((e) => e.ifaDate !== "—")?.ifaDate || "—",
      ifcSubDate,
      corSubDate: sortedEntries.find((e) => e.corDate !== "—")?.corDate || "—",
      comments: finalComment,
    };
  });

  return mergedRows;
}

/** Which submittals need a BFA lookup — the repository layer fetches exactly these. */
export function submittalsNeedingBfaLookup(submittalData: any[]): any[] {
  return (submittalData || []).filter((sub: any) => sub.bfaStatus === true && sub.status === "BFA_SENT");
}

// ---------------------------------------------------------------------------
// 3. Change order transform — ported from lines 722-822 and 891-952
// ---------------------------------------------------------------------------

export function buildCoRows(rawCOs: any[]): CoRow[] {
  return (rawCOs || []).map((co: any) => {
    let totalAmount = 0;
    const monthlyBreakdown: Record<string, string> = {};
    MONTHS.forEach((m) => (monthlyBreakdown[m] = ""));

    let currentVersion = co.currentVersion || null;
    if (!currentVersion && co.versions && Array.isArray(co.versions) && co.versions.length > 0) {
      currentVersion =
        co.versions.find((v: any) => v.id === co.currentVersionId) ||
        [...co.versions].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
    }

    let latestRefersTo = currentVersion?.changeOrderTables || currentVersion?.CoRefersTo || co.changeOrderTables;

    if (!latestRefersTo || latestRefersTo.length === 0) {
      if (Array.isArray(co.CoRefersTo)) {
        const targetVersionId = currentVersion?.id || co.currentVersionId;
        if (targetVersionId) {
          const hasVersionIds = co.CoRefersTo.some((item: any) => item.changeOrderVersionId);
          latestRefersTo = hasVersionIds ? co.CoRefersTo.filter((item: any) => item.changeOrderVersionId === targetVersionId) : co.CoRefersTo;
        } else {
          latestRefersTo = co.CoRefersTo;
        }
      } else {
        latestRefersTo = [];
      }
    }

    if (Array.isArray(latestRefersTo) && latestRefersTo.length > 0) {
      const monthSums: Record<string, number> = {};
      let hasAnyAmount = false;

      latestRefersTo.forEach((item: any) => {
        const itemDate = item.createdAt ? new Date(item.createdAt) : co.createdAt ? new Date(co.createdAt) : null;
        if (itemDate) {
          const mName = MONTHS[itemDate.getMonth()];
          monthSums[mName] = (monthSums[mName] || 0) + (Number(item.cost) || 0);
        }
      });

      MONTHS.forEach((m) => {
        if (monthSums[m] > 0) {
          monthlyBreakdown[m] = formatMoney(monthSums[m]);
          totalAmount += monthSums[m];
          hasAnyAmount = true;
        }
      });

      if (!hasAnyAmount) {
        const fallbackMonthIdx = co.createdAt ? new Date(co.createdAt).getMonth() : -1;
        if (fallbackMonthIdx >= 0) monthlyBreakdown[MONTHS[fallbackMonthIdx]] = "SENT";
      }
    } else {
      const amount = Number(co.totalCost) || Number(co.amount) || 0;
      totalAmount = amount;
      const coDate = co.createdAt || co.date ? new Date(co.createdAt || co.date) : null;
      const coMonthIndex = coDate ? coDate.getMonth() : -1;
      if (coMonthIndex >= 0) {
        monthlyBreakdown[MONTHS[coMonthIndex]] = amount > 0 ? formatMoney(amount) : "SENT";
      }
    }

    return {
      id: co.id || co._id,
      createdAt: co.createdAt || co.date || new Date().toISOString(),
      changeOrder: co.changeOrderNumber ? `COR-${String(co.changeOrderNumber).padStart(3, "0")}` : "COR-New",
      ...monthlyBreakdown,
      total: totalAmount > 0 ? formatMoney(totalAmount) : "—",
    };
  });
}

export function buildDisplayCoRows(filteredCoRows: CoRow[]): DisplayCoRow[] {
  if (!filteredCoRows || filteredCoRows.length === 0) {
    const empty: DisplayCoRow = { id: "cor-summary", changeOrder: "COR", total: "—" };
    MONTHS.forEach((m) => (empty[m] = "—"));
    return [empty];
  }

  const monthTotals: Record<string, number> = {};
  const monthHasSent: Record<string, boolean> = {};
  let grandTotal = 0;
  MONTHS.forEach((m) => {
    monthTotals[m] = 0;
    monthHasSent[m] = false;
  });

  filteredCoRows.forEach((c) => {
    MONTHS.forEach((m) => {
      const valStr = c[m];
      if (valStr && valStr !== "—") {
        if (valStr === "Sent" || valStr === "SENT") {
          monthHasSent[m] = true;
        } else {
          const num = Number(String(valStr).replace(/[^0-9.]/g, ""));
          if (!isNaN(num) && num > 0) {
            monthTotals[m] += num;
            grandTotal += num;
          }
        }
      }
    });
  });

  const summaryRow: DisplayCoRow = { id: "cor-summary", changeOrder: "COR", total: "—" };
  MONTHS.forEach((m) => {
    summaryRow[m] = monthTotals[m] > 0 ? formatMoney(monthTotals[m]) : monthHasSent[m] ? "SENT" : "—";
  });
  summaryRow.total = grandTotal > 0 ? formatMoney(grandTotal) : "—";

  return [summaryRow];
}

// ---------------------------------------------------------------------------
// 4. Week filters — ported from lines 844-952 (cumulative "up to week end")
// ---------------------------------------------------------------------------

import { isUpToWeek } from "./wpr.weeks";

export function filterRfis(rawRfis: RfiRow[], weekEnd: Date | null): RfiRow[] {
  if (!weekEnd) return rawRfis;
  return rawRfis.filter((r) => {
    const hasSent = isUpToWeek(r.sentDate, weekEnd);
    const hasResp = isUpToWeek(r.responseReceivedDate, weekEnd);
    const hasCreated = isUpToWeek(r.createdAt, weekEnd);
    const noDates = (!r.sentDate || r.sentDate === "—") && (!r.responseReceivedDate || r.responseReceivedDate === "—") && !r.createdAt;
    return hasSent || hasResp || hasCreated || noDates;
  });
}

export function filterScheduleRows(rawScheduleRows: ScheduleRow[], weekEnd: Date | null): ScheduleRow[] {
  if (!weekEnd) return rawScheduleRows;
  return rawScheduleRows
    .map((s) => {
      const filteredEntries = (s.unifiedEntries || []).filter((e) => {
        const entryDate = e.date || e.ifaDate || e.bfaDate || e.ifcDate || e.corDate;
        return !entryDate || entryDate === "—" || isUpToWeek(entryDate as any, weekEnd);
      });

      const hasValidEntryDate = filteredEntries.length > 0;
      const hasRowDate =
        isUpToWeek(s.startDate, weekEnd) ||
        isUpToWeek(s.ifaSubDate, weekEnd) ||
        isUpToWeek(s.bfaRecdDate, weekEnd) ||
        isUpToWeek(s.ifcSubDate, weekEnd) ||
        isUpToWeek(s.corSubDate, weekEnd);
      const hasUnspecifiedDates =
        (!s.startDate || s.startDate === "—") && (!s.ifaSubDate || s.ifaSubDate === "—") && (!s.ifcSubDate || s.ifcSubDate === "—");

      if (hasRowDate || hasValidEntryDate || hasUnspecifiedDates) {
        return { ...s, unifiedEntries: filteredEntries };
      }
      return null;
    })
    .filter((x): x is ScheduleRow => x !== null);
}

export function filterCoRows(rawCoRows: CoRow[], weekEnd: Date | null): CoRow[] {
  if (!weekEnd) return rawCoRows;
  return rawCoRows.filter((c) => isUpToWeek(c.createdAt, weekEnd));
}

// ---------------------------------------------------------------------------
// 5. PDF status-label map — ported from exportToPDF's schedule section
// ---------------------------------------------------------------------------

export const SCHEDULE_STATUS_LABELS: Record<string, string> = {
  WAITING_FOR_BFA: "WAITING FOR BFA",
  BFA_RECEIVED: "BFA RECEIVED",
  BFA_SENT: "BFA SENT",
  SUBMITTED_TO_EOR: "SUBMITTED TO EOR",
  RELEASE_FOR_FABRICATION: "RELEASE FOR FAB",
  NOT_APPROVED: "NOT APPROVED",
  REVISED_RESUBMITTAL: "REVISED & RESUBMITTED",
  REVISED_RESUBMIT_FOR_FABRICATION: "REVISED & RESUB FOR FAB",
  PENDING: "PENDING",
  COMPLETE: "BFA - COMPLETE",
  COMPLETED: "BFA - COMPLETE",
  CLOSED: "BFA - COMPLETE",
  PARTIAL: "BFA - PARTIAL",
  SUCCESS: "BFA - SUCCESS",
  SENT: "SENT",
  "100%_COMPLETE": "100% COMPLETE",
  "100%_CLOSED": "100% COMPLETE",
};

export function resolveScheduleStatusLabel(status: any): string {
  const key = String(status || "—").replace(/\s+/g, "_").toUpperCase();
  return SCHEDULE_STATUS_LABELS[key] || (status ? String(status).replace(/_/g, " ") : "—");
}
