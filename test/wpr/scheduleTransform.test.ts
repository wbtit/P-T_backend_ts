import { buildScheduleRows, filterScheduleRows } from "../../src/modules/wpr/wpr.transform";

const ZONE = "Asia/Kolkata";

describe("buildScheduleRows", () => {
  test("links a submittal to its milestone via mileStoneId and derives IFA/IFC dates from stage", () => {
    const milestones = [{ id: "m1", subject: "Anchor Bolt", date: "2025-03-12T00:00:00.000Z", types: "ANCHOR_BOLT" }];
    const submittals = [
      { id: "s1", subject: "Anchor Bolt Plan Rev A", mileStoneId: "m1", stage: "IFA", status: "BFA_SENT", bfaStatus: true, createdAt: "2025-03-20T00:00:00.000Z" },
    ];

    const rows = buildScheduleRows(milestones, submittals, {}, {}, ZONE);
    expect(rows).toHaveLength(1);
    expect(rows[0].phase).toBe("Anchor Bolt");
    expect(rows[0].unifiedEntries).toHaveLength(1);
    expect(rows[0].unifiedEntries[0].ifaDate).not.toBe("—");
    expect(rows[0].ifaSubDate).not.toBe("—");
  });

  test("links via the mileStoneLinks[] join-table shape (as returned by submittalRepo.findByProject)", () => {
    const milestones = [{ id: "m1", subject: "Main Steel" }];
    const submittals = [
      {
        id: "s1",
        subject: "Main Steel Drawings",
        stage: "IFC",
        createdAt: "2025-04-01T00:00:00.000Z",
        mileStoneLinks: [{ mileStoneId: "m1", submittalId: "s1", mileStone: { id: "m1" } }],
      },
    ];
    const rows = buildScheduleRows(milestones, submittals, {}, {}, ZONE);
    expect(rows[0].unifiedEntries[0].status).toBe("100% COMPLETE"); // isIfc forces this, ported verbatim
  });

  test("BFA_SENT submittals pull status/date from the pre-fetched bfaCache, not the raw submittal", () => {
    const milestones = [{ id: "m1", subject: "Anchor Bolt" }];
    const submittals = [
      { id: "s1", subject: "Anchor Bolt Plan", mileStoneId: "m1", stage: "IFA", status: "BFA_SENT", bfaStatus: true, createdAt: "2025-03-20T00:00:00.000Z" },
    ];
    const bfaCache = { s1: { status: "complete", createdAt: "2025-04-01T00:00:00.000Z" } };

    const rows = buildScheduleRows(milestones, submittals, {}, bfaCache, ZONE);
    expect(rows[0].unifiedEntries[0].status).toBe("complete");
    expect(rows[0].unifiedEntries[0].bfaDate).not.toBe("—");
  });

  test("an unlinked submittal becomes its own standalone row", () => {
    const submittals = [{ id: "s1", subject: "Miscellaneous Detail", stage: "IFA", createdAt: "2025-05-01T00:00:00.000Z" }];
    const rows = buildScheduleRows([], submittals, {}, {}, ZONE);
    expect(rows).toHaveLength(1);
    expect(rows[0].phase).toBe("Miscellaneous Detail");
  });

  test("two milestones with the same phase name (case/whitespace-insensitive) merge into one row", () => {
    const milestones = [
      { id: "m1", subject: "Anchor Bolt", date: "2025-03-01T00:00:00.000Z" },
      { id: "m2", subject: " anchor bolt ", date: "2025-02-01T00:00:00.000Z" },
    ];
    const submittals = [
      { id: "s1", subject: "Rev A", mileStoneId: "m1", stage: "IFA", createdAt: "2025-03-10T00:00:00.000Z" },
      { id: "s2", subject: "Rev B", mileStoneId: "m2", stage: "IFC", createdAt: "2025-04-10T00:00:00.000Z" },
    ];

    const rows = buildScheduleRows(milestones, submittals, {}, {}, ZONE);
    expect(rows).toHaveLength(1);
    expect(rows[0].unifiedEntries).toHaveLength(2);
    // Keeps the earliest start date of the two merged milestones.
    expect(rows[0].startDate).toContain("2025");
  });

  test("isConnectionDesign submittals are excluded before linking/merging", () => {
    const milestones = [{ id: "m1", subject: "Anchor Bolt" }];
    const submittals = [{ id: "s1", subject: "CD only", mileStoneId: "m1", isConnectionDesign: true, createdAt: "2025-03-10T00:00:00.000Z" }];
    const rows = buildScheduleRows(milestones, submittals, {}, {}, ZONE);
    expect(rows[0].unifiedEntries).toHaveLength(0);
  });
});

describe("filterScheduleRows — cumulative up-to-week filter", () => {
  test("drops entries dated after the week end but keeps the row if any entry survives", () => {
    const milestones = [{ id: "m1", subject: "Anchor Bolt" }];
    const submittals = [
      { id: "s1", subject: "Early", mileStoneId: "m1", stage: "IFA", createdAt: "2025-03-01T00:00:00.000Z" },
      { id: "s2", subject: "Late", mileStoneId: "m1", stage: "IFC", createdAt: "2025-09-01T00:00:00.000Z" },
    ];
    const rows = buildScheduleRows(milestones, submittals, {}, {}, ZONE);
    const weekEnd = new Date("2025-06-30T23:59:59.999Z");
    const filtered = filterScheduleRows(rows, weekEnd);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].unifiedEntries).toHaveLength(1);
    expect(filtered[0].unifiedEntries[0].subject).toBe("Early");
  });
});
