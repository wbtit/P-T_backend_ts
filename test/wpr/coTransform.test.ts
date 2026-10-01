import { buildCoRows, buildDisplayCoRows, filterCoRows } from "../../src/modules/wpr/wpr.transform";

describe("buildCoRows", () => {
  test("buckets CoRefersTo line items by month and sums cost", () => {
    const rows = buildCoRows([
      {
        id: "co1",
        changeOrderNumber: "7",
        createdAt: "2025-03-05T00:00:00.000Z",
        CoRefersTo: [
          { cost: 1200, createdAt: "2025-03-10T00:00:00.000Z" },
          { cost: 300.5, createdAt: "2025-03-20T00:00:00.000Z" },
          { cost: 2000, createdAt: "2025-05-02T00:00:00.000Z" },
        ],
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].changeOrder).toBe("COR-007");
    expect(rows[0].Mar).toBe("$1,500.5");
    expect(rows[0].May).toBe("$2,000");
    expect(rows[0].Jan).toBe("");
    expect(rows[0].total).toBe("$3,500.5");
  });

  test("falls back to a bare 'SENT' marker when line items have no cost", () => {
    const rows = buildCoRows([
      {
        id: "co2",
        changeOrderNumber: "8",
        createdAt: "2025-06-15T00:00:00.000Z",
        CoRefersTo: [{ cost: 0, createdAt: "2025-06-16T00:00:00.000Z" }],
      },
    ]);
    expect(rows[0].Jun).toBe("SENT");
    expect(rows[0].total).toBe("—");
  });

  test("falls back to co.totalCost/amount when there is no CoRefersTo at all", () => {
    const rows = buildCoRows([{ id: "co3", changeOrderNumber: "9", createdAt: "2025-07-01T00:00:00.000Z", totalCost: 500 }]);
    expect(rows[0].Jul).toBe("$500");
    expect(rows[0].total).toBe("$500");
  });

  test("unnumbered change orders get 'COR-New'", () => {
    const rows = buildCoRows([{ id: "co4", createdAt: "2025-01-01T00:00:00.000Z" }]);
    expect(rows[0].changeOrder).toBe("COR-New");
  });
});

describe("buildDisplayCoRows", () => {
  test("aggregates multiple CO rows into one summary row per month", () => {
    const filtered = buildCoRows([
      { id: "co1", changeOrderNumber: "1", createdAt: "2025-03-01T00:00:00.000Z", CoRefersTo: [{ cost: 1000, createdAt: "2025-03-05T00:00:00.000Z" }] },
      { id: "co2", changeOrderNumber: "2", createdAt: "2025-03-01T00:00:00.000Z", CoRefersTo: [{ cost: 500, createdAt: "2025-03-06T00:00:00.000Z" }] },
    ]);
    const [summary] = buildDisplayCoRows(filtered);
    expect(summary.Mar).toBe("$1,500");
    expect(summary.total).toBe("$1,500");
  });

  test("an empty input list produces a single all-dash summary row, not an empty array", () => {
    const [summary] = buildDisplayCoRows([]);
    expect(summary.changeOrder).toBe("COR");
    expect(summary.Jan).toBe("—");
    expect(summary.total).toBe("—");
  });

  test("a month where every row is just 'SENT' (no dollar amount) stays SENT, not $0", () => {
    const filtered = buildCoRows([{ id: "co1", changeOrderNumber: "1", createdAt: "2025-04-01T00:00:00.000Z", CoRefersTo: [{ cost: 0, createdAt: "2025-04-02T00:00:00.000Z" }] }]);
    const [summary] = buildDisplayCoRows(filtered);
    expect(summary.Apr).toBe("SENT");
  });
});

describe("filterCoRows — cumulative up-to-week filter", () => {
  test("keeps only rows created on or before the week end", () => {
    const rows = buildCoRows([
      { id: "co1", changeOrderNumber: "1", createdAt: "2025-03-01T00:00:00.000Z" },
      { id: "co2", changeOrderNumber: "2", createdAt: "2025-09-01T00:00:00.000Z" },
    ]);
    const weekEnd = new Date("2025-06-30T23:59:59.999Z");
    const filtered = filterCoRows(rows, weekEnd);
    expect(filtered.map((r) => r.id)).toEqual(["co1"]);
  });

  test("weekEnd=null returns everything unfiltered", () => {
    const rows = buildCoRows([{ id: "co1", changeOrderNumber: "1", createdAt: "2025-03-01T00:00:00.000Z" }]);
    expect(filterCoRows(rows, null)).toHaveLength(1);
  });
});
