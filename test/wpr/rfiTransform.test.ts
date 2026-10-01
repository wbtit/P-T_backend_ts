import { buildRfiRows } from "../../src/modules/wpr/wpr.transform";

const ZONE = "Asia/Kolkata";

describe("buildRfiRows", () => {
  test("filters out connection-design RFIs", () => {
    const rows = buildRfiRows(
      [
        { id: "1", subject: "RFI #1", isConnectionDesign: true, rfiresponse: [] },
        { id: "2", subject: "RFI #2", isConnectionDesign: false, rfiresponse: [] },
        { id: "3", subject: "RFI #3", isConnectionDesign: "true", rfiresponse: [] },
      ],
      ZONE
    );
    expect(rows.map((r) => r.id)).toEqual(["2"]);
  });

  test("an RFI with no responses yet is 'Waiting...' and PENDING", () => {
    const rows = buildRfiRows([{ id: "1", subject: "RFI #1", status: true, rfiresponse: [] }], ZONE);
    expect(rows[0].customerResponse).toBe("Waiting...");
    expect(rows[0].status).toBe("PENDING");
  });

  test("classifies a response as client-side via wbtStatus RECEIVED (no user relation populated)", () => {
    // Matches the real shape returned by rfiRepo.findByProject: `rfiresponse: true`
    // includes no `user` relation, so isClientResponse must fall back to wbtStatus/recipient matching.
    const rows = buildRfiRows(
      [
        {
          id: "1",
          subject: "RFI #12",
          rfiresponse: [
            { id: "r1", reason: "Please confirm base plate thickness.", wbtStatus: "SENT", createdAt: "2025-09-09T10:00:00.000Z" },
            { id: "r2", reason: "Confirmed 3/4in per detail 4/S-201.", wbtStatus: "RECEIVED", createdAt: "2025-09-12T09:00:00.000Z" },
          ],
        },
      ],
      ZONE
    );
    expect(rows[0].customerResponse).toBe("Confirmed 3/4in per detail 4/S-201.");
    expect(rows[0].status).toBe("RECEIVED");
  });

  test("wbtResponse picks the latest response NOT classified as the client's", () => {
    const rows = buildRfiRows(
      [
        {
          id: "1",
          subject: "RFI #1",
          rfiresponse: [
            { id: "r1", reason: "Initial WBT note", wbtStatus: "SENT", createdAt: "2025-09-01T00:00:00.000Z" },
            { id: "r2", reason: "Client confirms.", wbtStatus: "RECEIVED", createdAt: "2025-09-02T00:00:00.000Z" },
            { id: "r3", reason: "Updated model, resubmitting IFA.", wbtStatus: "SENT", createdAt: "2025-09-03T00:00:00.000Z" },
          ],
        },
      ],
      ZONE
    );
    expect(rows[0].wbtResponse).toBe("Updated model, resubmitting IFA.");
  });

  test("natural sort by RFI number: RFI #2 before RFI #12", () => {
    const rows = buildRfiRows(
      [
        { id: "a", subject: "RFI #12", rfiresponse: [] },
        { id: "b", subject: "RFI #2", rfiresponse: [] },
        { id: "c", subject: "RFI #1", rfiresponse: [] },
      ],
      ZONE
    );
    expect(rows.map((r) => r.rfiNo)).toEqual(["RFI #1", "RFI #2", "RFI #12"]);
  });

  test("unwraps {data: [...]} and {'show rfi': [...]} response envelopes", () => {
    expect(buildRfiRows({ data: [{ id: "1", subject: "RFI #1", rfiresponse: [] }] }, ZONE)).toHaveLength(1);
    expect(buildRfiRows({ "show rfi": [{ id: "1", subject: "RFI #1", rfiresponse: [] }] }, ZONE)).toHaveLength(1);
    expect(buildRfiRows(null, ZONE)).toHaveLength(0);
  });
});
