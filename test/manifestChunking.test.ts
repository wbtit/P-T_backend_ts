import { chunkPage, __resetLocalIds, PageManifest } from "../src/modules/standards/services/manifestChunking";

/**
 * Phase 2 amendment 11 invariant.
 *
 * Don't trust "the table loop doesn't touch reliabilityReason" as self-evident
 * -- assert the actual output shape directly. On a page that hit the
 * Amendment 11 exception (a confirmed table region coexists with
 * interleaved-text lines entirely outside its bbox): the TABLE parent and
 * every TABLE child must have reliabilityReason === null, and the PROSE
 * chunk must carry the reason. A regression here (e.g. a table loop
 * accidentally inheriting `base` in a way that leaks the field) would
 * mislabel table cell content as unreliable, or worse, silently drop the
 * hedge on genuinely unreliable prose.
 */
test("amendment 11: table chunks stay reliabilityReason=null, prose chunk carries it", () => {
  __resetLocalIds();

  const manifest: PageManifest = {
    documentId: "doc-1",
    pageIndex: 0,
    pageNumber: 1,
    validity: { status: "VALID", reason: "" },
    heading: { heading: "K-Series Load Table", headingSource: "REGEX" },
    tables: [
      {
        bbox: [50, 50, 500, 200],
        status: "EXTRACTED",
        refinementApplied: false,
        rowHeightRatio: null,
        nRows: 2,
        nCols: 2,
        cells: [
          ["Joist", "Weight"],
          ["24K6", "12.5"],
        ],
      },
    ],
    rejectedRegions: [],
    proseText: "Footnote: capacities shown are for uniformly distributed loads.",
    ocrText: "",
    extractionMethod: "VECTOR_LINES",
    extractionStatus: "EXTRACTED",
    visualOnlyReason: null,
    proseReliabilityReason: "INTERLEAVED_TEXT",
    hyperlinks: [],
  };

  const chunks = chunkPage(manifest);

  const prose = chunks.filter((c) => c.chunkType === "PROSE");
  const tables = chunks.filter((c) => c.chunkType === "TABLE");

  expect(prose.length).toBe(1);
  expect(prose[0].reliabilityReason).toBe("INTERLEAVED_TEXT");

  expect(tables.length).toBeGreaterThan(0);
  for (const t of tables) {
    expect(t.reliabilityReason).toBeNull();
  }
});

test("unaffected page: proseReliabilityReason absent leaves every chunk null", () => {
  __resetLocalIds();

  const manifest: PageManifest = {
    documentId: "doc-1",
    pageIndex: 1,
    pageNumber: 2,
    validity: { status: "VALID", reason: "" },
    heading: {},
    tables: [
      {
        bbox: [50, 50, 500, 200],
        status: "EXTRACTED",
        refinementApplied: false,
        rowHeightRatio: null,
        nRows: 2,
        nCols: 2,
        cells: [
          ["Joist", "Weight"],
          ["24K6", "12.5"],
        ],
      },
    ],
    rejectedRegions: [],
    proseText: "Ordinary clean page, no interleaving detected.",
    ocrText: "",
    extractionMethod: "VECTOR_LINES",
    extractionStatus: "EXTRACTED",
    visualOnlyReason: null,
    hyperlinks: [],
  };

  const chunks = chunkPage(manifest);
  for (const c of chunks) {
    expect(c.reliabilityReason).toBeNull();
  }
});
