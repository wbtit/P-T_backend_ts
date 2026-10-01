import { buildReportMeta, WPR_TITLE_BLOCK_DEFAULTS } from "../../src/modules/wpr/wpr.pdf";

const ZONE = "Asia/Kolkata";

/**
 * FE ground truth (WorkProgressReport.tsx exportToPDF, lines 1485-1540):
 *   FORM NO            -> literal "WBT/PMO/WPR-001" (hardcoded, not the
 *                          week-derived formNo state the on-screen header uses)
 *   VERSION            -> literal "1.0"
 *   EFF DATE           -> literal "05/09/2024"
 *   PROJECT AWARDED    -> fmtDate(project.startDate), fmtDate = bare
 *                          `new Date(d).toLocaleDateString()` — not zero-padded
 *   APPROVAL DATE      -> fmtDate(project.approvalDate)
 *   FAB RELEASED DATE  -> fmtDate(project.fabricationDate)
 */
describe("buildReportMeta — title block matches the FE's exportToPDF exactly", () => {
  const fixtureProject = {
    fabricator: { fabName: "Cobb Industrial, Inc." },
    name: "26-016- Midland Beal Park",
    manager: { firstName: "Priya", lastName: "Nair" },
    tools: "SDS2",
    startDate: "2026-03-05T00:00:00.000Z",
    approvalDate: "2026-04-02T00:00:00.000Z",
    fabricationDate: "2026-10-04T00:00:00.000Z", // single-digit day, to catch zero-padding
  };
  const circulatedTo = { fabProjectManager: "ROB TUCCI", fabCirculatedTo: "—", wbtCirculatedTo: "PRIYA NAIR" };
  const weekEnding = new Date("2026-10-04T18:29:59.999Z"); // Sunday 23:59:59.999 IST

  const meta = buildReportMeta(fixtureProject, weekEnding, circulatedTo, ZONE);

  test("FORM NO is the FE's hardcoded literal, regardless of week", () => {
    expect(meta.formNo).toBe("WBT/PMO/WPR-001");
    expect(meta.formNo).toBe(WPR_TITLE_BLOCK_DEFAULTS.FORM_NO);
  });

  test("VERSION is the FE's hardcoded literal", () => {
    expect(meta.version).toBe("1.0");
    expect(meta.version).toBe(WPR_TITLE_BLOCK_DEFAULTS.VERSION);
  });

  test("EFF DATE is the FE's hardcoded literal", () => {
    expect(meta.effDate).toBe("05/09/2024");
    expect(meta.effDate).toBe(WPR_TITLE_BLOCK_DEFAULTS.EFF_DATE);
  });

  test("PROJECT AWARDED is formatted like the FE's bare toLocaleDateString — not zero-padded", () => {
    expect(meta.projectAwarded).toBe("3/5/2026");
  });

  test("APPROVAL DATE is formatted like the FE's bare toLocaleDateString — not zero-padded", () => {
    expect(meta.approvalDate).toBe("4/2/2026");
  });

  test("FAB RELEASED DATE is formatted like the FE's bare toLocaleDateString — not zero-padded", () => {
    expect(meta.fabReleasedDate).toBe("10/4/2026"); // "10/4", not "10/04"
  });

  test("a missing date field falls back to the em dash, same as the FE's fmtDate", () => {
    const metaNoDates = buildReportMeta(
      { fabricator: null, name: "No Dates Project", manager: null, tools: null, startDate: null, approvalDate: null, fabricationDate: null },
      weekEnding,
      { fabProjectManager: "", fabCirculatedTo: "", wbtCirculatedTo: "" },
      ZONE
    );
    expect(metaNoDates.projectAwarded).toBe("—");
    expect(metaNoDates.approvalDate).toBe("—");
    expect(metaNoDates.fabReleasedDate).toBe("—");
    // FORM NO / VERSION / EFF DATE never change, even with no project data at all.
    expect(metaNoDates.formNo).toBe("WBT/PMO/WPR-001");
    expect(metaNoDates.version).toBe("1.0");
    expect(metaNoDates.effDate).toBe("05/09/2024");
  });
});
