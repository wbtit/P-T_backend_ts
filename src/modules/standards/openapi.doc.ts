import { ModuleOpenApiDoc } from "../../openapi/types";

const standards_doc: ModuleOpenApiDoc = {
  tags: [
    {
      name: "Standards",
      description:
        "Endpoints for managing and querying PDF standards.\n\n" +
        "**Base URL (gpuserver1, LAN):** `http://192.168.1.11:5156/v1` -- this session's real, reachable LAN IP for the host referred to as \"gpuserver1\" throughout this project's docs; the machine's own `hostname` differs, use the IP. Locally on that machine, `http://localhost:5156/v1` is equivalent.\n\n" +
        "**Auth:** every endpoint below except `GET /standards/image/{documentId}/{pageNumber}` requires `Authorization: Bearer <token>`. **Temporary limitation, stated plainly for the frontend team:** there is no login flow wired up yet for this API surface. Every token used to verify these endpoints this session was minted directly against the app's own `JWT_SECRET` (`src/config/utils/jwtutils.ts`'s `generateToken()`) against a real `User` row pulled from the DB, via a throwaway script -- not obtained through any real auth endpoint. Tokens minted this way are valid, real JWTs the app accepts (10h expiry in the scripts used this session), but this is a dev-only workaround, not a sanctioned issuance path. Treat this as temporary scaffolding until a real login/token endpoint exists for this surface.\n\n" +
        "**Running this locally:** `npm run dev` starts both the TS server and the Standards reranker service (required for `POST /projects/{projectId}/standards/query`) together in one command -- previously two separate manual commands. See the repo README's \"Local development\" section for details.",
    },
  ],
  paths: {
    "/standards/families": {
      get: {
        tags: ["Standards"],
        summary: "Get available standard families",
        description: "Returns a list of available standard families, optionally filtered by tier (GENERAL). Only returns families that have at least one ACTIVE document for the given constraints.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "tier",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["GENERAL"] },
            description: "Filter by standard tier (GENERAL)"
          }
        ],
        responses: {
          "200": {
            description: "List of standard families",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    families: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          familyCode: { type: "string" },
                          edition: { type: "string" },
                          isDefault: { type: "boolean" },
                          createdAt: { type: "string", format: "date-time" },
                          updatedAt: { type: "string", format: "date-time" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            description: "Bad request - invalid tier or missing projectId"
          },
          "401": {
            description: "Unauthorized"
          },
          "500": {
            description: "Internal server error"
          }
        }
      }
    },
    "/standards/fabricators/{fabricatorId}/families": {
      get: {
        tags: ["Standards"],
        summary: "Get available standard families for a specific fabricator",
        description: "Returns a list of available standard families that are either GENERAL tier or FABRICATOR tier for the specified fabricator. Only returns families that have at least one ACTIVE document.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "fabricatorId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "The ID of the fabricator"
          }
        ],
        responses: {
          "200": {
            description: "List of standard families",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    families: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          familyCode: { type: "string" },
                          edition: { type: "string" },
                          isDefault: { type: "boolean" },
                          createdAt: { type: "string", format: "date-time" },
                          updatedAt: { type: "string", format: "date-time" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            description: "Bad request - missing fabricatorId"
          },
          "401": {
            description: "Unauthorized"
          },
          "500": {
            description: "Internal server error"
          }
        }
      }
    },
    "/standards/image/{documentId}/{pageNumber}": {
      get: {
        tags: ["Standards"],
        summary: "Get a standard document page image",
        description:
          "Serves the rendered page image for a document/page pair directly from disk (`standard_pages.image_path`, whatever it actually contains -- absolute or relative, so it works regardless of which storage convention wrote it). This is the `getPageImage` implementation (Phase 6); it replaced a broken predecessor whose path math unconditionally mangled the real, already-absolute paths the extractor writes -- confirmed live via this session's own testing. " +
          "**No authentication required** -- confirmed live this session (a real request with no `Authorization` header at all returned 200): this route has no `authMiddleware` in `routes.ts`, unlike every other Standards endpoint. This is the same URL shape `results[].imageUrl` (from `POST /projects/{projectId}/standards/query`) and the legacy `/chat` citation `imagePaths` both already emit.",
        parameters: [
          {
            name: "documentId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "pageNumber",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "1-indexed page number.",
          },
        ],
        responses: {
          "200": {
            description: "Real page image, served as-is (observed as image/png for every real document ingested this session; the underlying extractor could in principle emit other raster formats via `res.sendFile`, but PNG is what's actually produced).",
            content: {
              "image/png": {
                schema: {
                  type: "string",
                  format: "binary"
                }
              },
              "image/jpeg": {
                schema: {
                  type: "string",
                  format: "binary"
                }
              }
            }
          },
          "404": {
            description:
              "Two real, distinct cases, both returning this same JSON shape: (1) no `standard_pages` row for this documentId+pageNumber, or its `image_path` is null -- message \"Image not found for this page.\" (confirmed live this session against both an out-of-range page number and a nonexistent documentId). (2) A page row exists with an `image_path`, but the file is missing on disk (e.g. the pre-cleanup `/tmp`-wiped documents this session fixed) -- message \"Image file not found on disk.\" (present in the controller code, not independently triggered live this session since the corpus was corrected before this doc was written).",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
                examples: {
                  noPageRow: {
                    summary: "Real capture -- out-of-range page number",
                    value: { message: "Image not found for this page." },
                  },
                  fileGoneFromDisk: {
                    summary: "Page row exists but file missing on disk (not independently re-triggered after this session's cleanup; from controller source)",
                    value: { message: "Image file not found on disk." },
                  },
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
          }
        }
      }
    },
    // -----------------------------------------------------------------
    // Phase 6: the real, tested endpoints wired only to the Phase 2-5
    // pipeline (ingestDocument() / activateStandardDocument() / askStandards()).
    // Every example below is a real, live-captured response from a real
    // call made against a running instance of this server this session --
    // not hand-written. See standards.controller.ts for the exact source.
    // -----------------------------------------------------------------
    "/standards/documents": {
      post: {
        tags: ["Standards"],
        summary: "Upload a standard document (Phase 6, async)",
        description:
          "Uploads a PDF and enqueues it on `documentIngestionQueue` for the real Phase 2 pipeline (`ingestDocument()`). **Asynchronous**: returns `202` immediately with the new `documentId`; extraction alone measured up to ~68s for a 166-page document and minutes for a 2000+-page one (2325-page AISC manual measured ~19 minutes end-to-end this session) -- no caller should hold a connection open waiting for this. Poll `GET /standards/documents/{id}` until `status===\"PENDING\" && processingStage===null` (or `\"FAILED\"`).\n\n" +
          "**`commit` controls dry-run vs. real ingestion** (`multipart` field, `\"true\"`/`\"false\"`; falsy/omitted = dry-run). A dry-run computes the full extraction/chunking/embedding report (`ingestReport`) but writes nothing to `standard_pages`/`standard_chunks` -- confirmed live this session: a dry-run's final `ingestReport.committed` is `false`, has no `written` key, and the document's own `pagesProcessed`/`totalPages` stay `0`. **Integration hazard, not currently blocked by the API**: `POST .../activate` only checks `status===\"PENDING\"` -- it does NOT check whether the document was ever committed. Activating a dry-run document will flip it to `ACTIVE` with zero real content indexed. Always check `ingestReport.committed === true` (via the STATUS endpoint) before calling activate.\n\n" +
          "Storage convention (Phase 6): the file is moved to `uploads/standards/<general|fabricator>/[<fabricatorNameSlug>/]<documentId>/source.pdf`, one folder per document, filename by documentId not original filename. For `sourceType=FABRICATOR`, the folder is the fabricator's real name, slugified (lowercased, non-alphanumeric stripped, spaces to hyphens) -- e.g. `Cobb Industrial, Inc.` -> `cobb-industrial-inc` -- not the fabricator's UUID, for human traceability when browsing the disk directly. Was `<fabricatorId>` originally; a bad/nonexistent `fabricatorId` now fails the upload with a real `400` (see below) rather than silently using the id as the folder name.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file", "sourceType", "documentFamilyId", "familyCode", "edition"],
                properties: {
                  file: { type: "string", format: "binary", description: "The PDF file." },
                  sourceType: { type: "string", enum: ["GENERAL", "FABRICATOR"] },
                  documentFamilyId: { type: "string", description: "Family id -- created via upsert if it doesn't exist yet (using familyCode/edition below)." },
                  familyCode: { type: "string", description: "Required. Immutable once the family exists." },
                  edition: { type: "string", description: "Required. Immutable once the family exists." },
                  fabricatorId: { type: "string", format: "uuid", description: "Required when sourceType=FABRICATOR; must be omitted for GENERAL." },
                  isDefault: { type: "boolean", description: "Optional default flag for the standard family." },
                  commit: { type: "string", enum: ["true", "false"], description: "Default false (dry-run). See description above." },
                },
              },
            },
          },
        },
        responses: {
          "202": {
            description: "Ingestion queued. Two real captures below: one dry-run (commit=false), one committed (commit=true) -- both otherwise identical in shape at this point (the difference only shows up later, via STATUS's ingestReport).",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    documentId: { type: "string", format: "uuid" },
                    status: { type: "string", example: "PENDING" },
                    commit: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
                examples: {
                  dryRun: {
                    summary: "Real capture -- commit=false",
                    value: { documentId: "6b2034bb-0eb6-4f6b-b7a3-45b1fc625c06", status: "PENDING", commit: false, message: "Ingestion queued. Poll GET /standards/documents/:id for progress." },
                  },
                  committed: {
                    summary: "Real capture -- commit=true",
                    value: { documentId: "53f2c7a7-1ee1-4f03-8ac8-37c7a885d8cb", status: "PENDING", commit: true, message: "Ingestion queued. Poll GET /standards/documents/:id for progress." },
                  },
                },
              },
            },
          },
          "400": {
            description: "Every real validation message the controller returns, in the order it checks them.",
            content: {
              "application/json": {
                schema: { type: "object", properties: { message: { type: "string" } } },
                examples: {
                  noFile: { summary: "Real capture", value: { message: "No file uploaded" } },
                  badSourceType: { value: { message: "sourceType must be GENERAL or FABRICATOR" } },
                  missingFamily: { summary: "Real capture", value: { message: "documentFamilyId is required" } },
                  missingFabricatorId: { value: { message: "fabricatorId is required for FABRICATOR sourceType" } },
                  fabricatorNotFound: { summary: "Real capture -- a nonexistent fabricatorId, checked before anything is created (no stray document row, no folder)", value: { message: "fabricatorId 00000000-0000-0000-0000-000000000000 does not match any real fabricator" } },
                  missingFamilyCodeOrEdition: { value: { message: "familyCode and edition are required when providing documentFamilyId" } },
                },
              },
            },
          },
          "401": {
            description: "Missing/invalid bearer token.",
            content: {
              "application/json": {
                schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" } } },
                example: { success: false, message: "Authorization header must be provided in Bearer format" },
              },
            },
          },
          "500": {
            description: "Internal server error (e.g. failed to enqueue the ingestion job -- the created document row is marked FAILED first).",
          },
        },
      },
      get: {
        tags: ["Standards"],
        summary: "List standard documents (Phase 6)",
        description:
          "Lists `standard_documents`, newest-uploaded first. **No pagination exists on this endpoint currently** (confirmed directly against the controller source -- `findMany` with no `skip`/`take`) -- flagged for the frontend team rather than assumed away.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["PENDING", "PROCESSING", "ACTIVE", "SUPERSEDED", "FAILED"] }, description: "Exact match." },
          { name: "sourceType", in: "query", required: false, schema: { type: "string", enum: ["GENERAL", "FABRICATOR"] }, description: "Exact match." },
          { name: "documentFamilyId", in: "query", required: false, schema: { type: "string" }, description: "Exact match." },
          { name: "fabricatorId", in: "query", required: false, schema: { type: "string", format: "uuid" }, description: "Exact match." },
        ],
        responses: {
          "200": {
            description: "Real capture: GET /standards/documents?documentFamilyId=OPENAPI-DOC-EXAMPLE",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    documents: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          pdfName: { type: "string" },
                          sourceType: { type: "string" },
                          status: { type: "string" },
                          documentFamilyId: { type: "string", nullable: true },
                          fabricatorId: { type: "string", nullable: true },
                          totalPages: { type: "integer" },
                          pagesProcessed: { type: "integer" },
                          uploadedAt: { type: "string", format: "date-time" },
                          documentFamily: {
                            type: "object",
                            nullable: true,
                            properties: { familyCode: { type: "string" }, edition: { type: "string" } },
                          },
                        },
                      },
                    },
                  },
                },
                example: {
                  documents: [
                    { id: "53f2c7a7-1ee1-4f03-8ac8-37c7a885d8cb", pdfName: "JoistTopChordWidth.pdf", sourceType: "GENERAL", status: "PENDING", documentFamilyId: "OPENAPI-DOC-EXAMPLE", fabricatorId: null, totalPages: 2, pagesProcessed: 2, uploadedAt: "2026-09-15T07:30:50.943Z", documentFamily: { familyCode: "OPENAPI-DOC-EXAMPLE", edition: "1" } },
                    { id: "6b2034bb-0eb6-4f6b-b7a3-45b1fc625c06", pdfName: "JoistTopChordWidth.pdf", sourceType: "GENERAL", status: "PENDING", documentFamilyId: "OPENAPI-DOC-EXAMPLE", fabricatorId: null, totalPages: 0, pagesProcessed: 0, uploadedAt: "2026-09-15T07:30:25.803Z", documentFamily: { familyCode: "OPENAPI-DOC-EXAMPLE", edition: "1" } },
                  ],
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/standards/documents/{id}": {
      get: {
        tags: ["Standards"],
        summary: "Get a single document's status (Phase 6)",
        description:
          "The endpoint `POST /standards/documents`'s caller polls. Includes `ingestReport` (absent from the older `.../progress` endpoint above), the full report from the most recent ingestion run, dry-run or committed.\n\n" +
          "**Status values and what a frontend should do at each:**\n" +
          "- `PENDING` + `processingStage=null`, `ingestReport=null`: uploaded, not yet picked up by the worker. Keep polling.\n" +
          "- `PENDING` + `processingStage` non-null (`EXTRACTING`|`CHUNKING`|`EMBEDDING`|`DESCRIBING`|`PERSISTING`): **this is a real, observed transient state, not a bug** -- the worker sets `status` back to `PROCESSING` on pickup, but during the tail end of a run this session observed polls catching `status=PENDING` with `processingStage` not yet cleared to null before the final update commits. Keep polling; do not treat this as \"done.\"\n" +
          "- `PROCESSING`: actively running. `processingStage` tells you which real pipeline stage (`EXTRACTING`->`CHUNKING`->`EMBEDDING`->`DESCRIBING`->`PERSISTING`; the last three only occur when `commit=true`). `DESCRIBING` (added this pass) generates a 2-3 sentence page description per page, ~1.6s measured average per page -- for a large document this is a real, non-trivial chunk of total ingestion time (e.g. ~60 extra minutes for a 2325-page document), not just a quick pass. Keep polling.\n" +
          "- `PENDING` + `processingStage=null` + `ingestReport` present: **done**, awaiting activation. Check `ingestReport.committed` before offering an \"Activate\" action (see the dry-run hazard noted on the UPLOAD endpoint above).\n" +
          "- `ACTIVE`: live and retrievable via QUERY.\n" +
          "- `SUPERSEDED`: was ACTIVE, replaced by a newer activation in the same scope. Historical only.\n" +
          "- `FAILED`: stop polling, show `failureReason` to the user. Re-uploading is the explicit retry -- this pipeline does not auto-retry (deliberate: a retry would silently re-run a multi-minute extraction from scratch).",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Two real captures below: the dry-run document's final state, and the committed document's final state (note the extra `written`/`truncated` keys inside `ingestReport` that only appear once `commit=true`).",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    pdfName: { type: "string" },
                    sourceType: { type: "string" },
                    status: { type: "string" },
                    processingStage: { type: "string", nullable: true },
                    pagesProcessed: { type: "integer" },
                    totalPages: { type: "integer" },
                    failureReason: { type: "string", nullable: true },
                    ingestReport: { type: "object", nullable: true, description: "Full IngestReport once a run completes -- see real examples." },
                    documentFamilyId: { type: "string", nullable: true },
                    fabricatorId: { type: "string", nullable: true },
                    uploadedAt: { type: "string", format: "date-time" },
                  },
                },
                examples: {
                  dryRun: {
                    summary: "Real capture -- commit=false, done",
                    value: {
                      id: "6b2034bb-0eb6-4f6b-b7a3-45b1fc625c06",
                      pdfName: "JoistTopChordWidth.pdf",
                      sourceType: "GENERAL",
                      status: "PENDING",
                      processingStage: null,
                      pagesProcessed: 0,
                      totalPages: 0,
                      failureReason: null,
                      ingestReport: {
                        pages: 2,
                        byType: { PROSE: 2 },
                        chunks: 2,
                        parents: 2,
                        children: 0,
                        embedded: 2,
                        committed: false,
                        documentId: "6b2034bb-0eb6-4f6b-b7a3-45b1fc625c06",
                        notEmbedded: 0,
                        truncationRisk: 0,
                      },
                      documentFamilyId: "OPENAPI-DOC-EXAMPLE",
                      fabricatorId: null,
                      uploadedAt: "2026-09-15T07:30:25.803Z",
                    },
                  },
                  committed: {
                    summary: "Real capture -- commit=true, done",
                    value: {
                      id: "53f2c7a7-1ee1-4f03-8ac8-37c7a885d8cb",
                      pdfName: "JoistTopChordWidth.pdf",
                      sourceType: "GENERAL",
                      status: "PENDING",
                      processingStage: null,
                      pagesProcessed: 2,
                      totalPages: 2,
                      failureReason: null,
                      ingestReport: {
                        pages: 2,
                        byType: { PROSE: 2 },
                        chunks: 2,
                        parents: 2,
                        written: { pages: 2, deletedChunks: 0, insertedParents: 2, insertedChildren: 0 },
                        children: 0,
                        embedded: 2,
                        committed: true,
                        truncated: [],
                        documentId: "53f2c7a7-1ee1-4f03-8ac8-37c7a885d8cb",
                        notEmbedded: 0,
                        truncationRisk: 0,
                      },
                      documentFamilyId: "OPENAPI-DOC-EXAMPLE",
                      fabricatorId: null,
                      uploadedAt: "2026-09-15T07:30:50.943Z",
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": {
            description: "Real capture.",
            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" } } }, example: { message: "Document not found" } } },
          },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/standards/documents/{id}/activate": {
      post: {
        tags: ["Standards"],
        summary: "Activate a document (Phase 6, no more auto-supersession)",
        description:
          "Wraps `activateStandardDocument()`, with a **PENDING-only guard** the underlying service itself does not enforce.\n\n" +
          "**Default (no `supersedesDocumentId`): activates, supersedes NOTHING.** Two genuinely different documents in the same `(sourceType, documentFamilyId, fabricatorId)` scope -- different editions of a manual, two distinct fabricator standards -- now coexist as separate ACTIVE documents, always searchable, both cited independently when relevant. This replaced automatic family-based supersession (every prior version of this endpoint auto-superseded any other ACTIVE document sharing that scope) -- confirmed via a corpus audit before removing it that every real supersession to date (16/16) was the same source content re-ingested to fix a bug, never two genuinely different documents, so nothing in the live corpus depended on the old auto-behavior; the audit and the caller-impact analysis are recorded in this session's own report, not repeated here.\n\n" +
          "**`supersedesDocumentId` (optional, request body):** names one specific prior document to explicitly replace -- the one legitimate reason to supersede: re-ingesting the exact same source content (e.g. this session's own AISC/SJI/ccd/Hilti image-path fixes). Validated, not blindly trusted: the named document must currently be `ACTIVE` (`400` otherwise) and must be in the exact same scope as the document being activated (`400` on a cross-scope attempt) -- refusing rather than silently allowing an accidental cross-family supersession.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  supersedesDocumentId: { type: "string", format: "uuid", description: "Optional. Explicitly names one ACTIVE document, in the same scope as the one being activated, to supersede. Omit to activate without superseding anything." },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Real captures below: default (no supersedesDocumentId, two different documents left coexisting ACTIVE in the same family), and explicit supersedesDocumentId (exactly the named document superseded, a third sibling in the same family left untouched).",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    documentId: { type: "string", format: "uuid" },
                    activated: { type: "boolean" },
                    supersededCount: { type: "integer", description: "0 (default path, or supersedesDocumentId omitted) or 1 (supersedesDocumentId provided and validated) -- never more than 1 now." },
                    status: { type: "string" },
                  },
                },
                examples: {
                  noSupersede: {
                    summary: "Real capture -- no supersedesDocumentId. A second document in the SAME family, activated right after a first -- both ended up ACTIVE simultaneously, confirmed by a direct DB read.",
                    value: { documentId: "f6d44063-047b-436a-a7c5-8824589baf3d", activated: true, supersededCount: 0, status: "ACTIVE" },
                  },
                  explicitSupersede: {
                    summary: "Real capture -- supersedesDocumentId provided, targeting one specific sibling document in the same family (a different sibling, activated moments earlier, was left untouched -- confirmed by a direct DB read).",
                    value: { documentId: "47213f34-9db0-4669-8a52-f01e90d3e78c", activated: true, supersededCount: 1, status: "ACTIVE" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Real captures -- both supersedesDocumentId validation failures.",
            content: {
              "application/json": {
                schema: { type: "object", properties: { message: { type: "string" } } },
                examples: {
                  crossScope: {
                    summary: "Real capture -- supersedesDocumentId pointed at a document in a different family",
                    value: { message: "supersedesDocumentId ac438ab8-3c4a-45ec-ab74-cbf10580f6d8 is not in the same scope (sourceType/documentFamilyId/fabricatorId) as 87d4bbd1-b743-4ab9-8246-1dcc60e49ef7 -- refusing to supersede across scopes" },
                  },
                  notActive: {
                    summary: "Real capture -- supersedesDocumentId pointed at an already-SUPERSEDED document",
                    value: { message: "supersedesDocumentId 0b4817db-e93e-4334-9ab8-d2b5fa91070d is not ACTIVE (status: SUPERSEDED) -- nothing to supersede" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": {
            description: "Real capture.",
            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" } } }, example: { message: "Document not found" } } },
          },
          "409": {
            description: "Real capture -- the PENDING-only guard. Triggered by any non-PENDING status (PROCESSING, ACTIVE, SUPERSEDED, or FAILED), not just an already-ACTIVE document; the `status` field in the response tells you which.",
            content: {
              "application/json": {
                schema: { type: "object", properties: { message: { type: "string" }, status: { type: "string" } } },
                example: { message: "Cannot activate a document with status ACTIVE. Only PENDING documents can be activated.", status: "ACTIVE" },
              },
            },
          },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/projects/{projectId}/standards/query": {
      post: {
        tags: ["Standards"],
        summary: "Query project standards (Phase 6, Google-style)",
        description:
          "The new, product-shaped endpoint: an AI summary plus ranked candidate documents (not a single chat answer). Wraps the same `askStandards()` the pre-existing `/chat` route calls, but exposes its richer return shape instead of unwrapping it to `.message` (`/chat`'s own response body is untouched by this addition). `messageId` links back into `GET .../chat/history` for a frontend that wants that, but isn't required to render the response itself.\n\n" +
          "**`aiSummary` / `deferralReason` are mutually exclusive** -- confirmed directly from the source (`chatService.ts`'s `askStandards()`): exactly one of the two is non-null in every real response, never both, never neither. Render `aiSummary` when present; otherwise show `deferralReason` as the explanation for why no synthesized answer is shown, and let `results[]` stand on its own (candidate documents/pages the user can look at directly).\n\n" +
          "**Every real `deferralReason` value** (exact strings, from `chatService.ts`; treat as an enum for display purposes even though the field is a plain string):\n" +
          "- `\"No standards are currently available for this project.\"` -- project has no ACTIVE documents in scope at all. `results` is `[]`.\n" +
          "- `\"No matching content found for this query.\"` -- retrieval pool came back empty, even after any rewrite attempts. `results` is `[]`.\n" +
          "- `\"Retrieval could not confidently distinguish the best match from close competitors -- showing top candidates instead of a synthesized answer.\"` -- CRAG graded AMBIGUOUS (top-2 candidates tied), and if a rewrite was attempted, none of its 3 candidates reached CONFIDENT either -- this is always the ORIGINAL query's own AMBIGUOUS result, never a failed rewrite's. `results` has real candidates; show them, don't show a summary.\n" +
          "- `\"The best-matching content could not be verified as reliable (an extraction-quality issue, not a retrieval miss) -- see the page image directly.\"` -- every top candidate is itself flagged unreliable (extraction-quality hard deferral, not a retrieval failure -- rewriting is never attempted for this case, since it isn't an AMBIGUOUS/empty-pool grade). Point the user at the page image.\n" +
          "- `\"The retrieved content does not appear to directly answer this query.\"` -- retrieval succeeded (on the original query, or a rewrite that rescued it to CONFIDENT) and content was reliable, but the LLM declined to generate an answer from it. `results` still has real candidates.\n\n" +
          "**Conditional query rewrite (added this pass).** If the ORIGINAL query grades AMBIGUOUS or returns an empty pool, the query rewriter (`queryRewrite.ts`, previously built but not wired in) generates 3 rephrased candidates and retries retrieval+rerank+grading for each, **sequentially, stopping at the first that reaches CONFIDENT** -- not always running all 3. Confirmed via the reranker's own startup log that it is single-request-only, so running candidates concurrently would only queue behind each other at that layer, not actually parallelize; sequential-with-early-stop is strictly faster than always running all 3 in the common case (an early candidate rescues it) and no slower in the worst case (none do), so there was no scenario where running all 3 unconditionally would have been faster. **An already-CONFIDENT original query never triggers rewriting at all** -- no added latency for the common case. If a rewrite reaches CONFIDENT, its result (not the original's) is returned, and the final answer generation step (when applicable) is prompted with the rewritten text, not the original -- confirmed live: a rewrite that fixes retrieval but leaves the LLM generation step reading the original confusing phrasing would defeat the point. If none of the 3 rewrites reach CONFIDENT, the response falls back to the ORIGINAL query's own AMBIGUOUS/empty-pool result unchanged -- never a worse or arbitrary result just because a rewrite ran.\n\n" +
          "`queryRewritten` (boolean) is `true` only when a rewrite actually rescued the result (never true just because rewriting was attempted and failed). `effectiveQuery` (string, nullable) is the exact rewrite text that produced the returned answer, or `null` if no rewrite happened -- a frontend can use it to show \"we searched for: X\".\n\n" +
          "**Latency, real measured data (this pass, live corpus, 9 real calls):** an already-CONFIDENT original query (the common case, rewriting skipped entirely): **~10-24s**, same range as before this change -- no added cost. A query that triggers rewriting and gets rescued: **~35-40s** measured across 3 real rescues (1 rewrite attempt before success: ~35s; 2 attempts before success: ~39-40s) -- confirmed via server-log timestamps that the reranker itself is fast (~2.8s/call, load+infer) and NOT the bottleneck; the added cost is the rewrite-generation LLM call plus each extra retrieval+rerank pass. **The true worst case (all 3 rewrites fail, falls back to the original AMBIGUOUS deferral) was not directly captured live** -- 9 real queries against the live corpus this pass either resolved CONFIDENT immediately or were rescued within 1-2 rewrite attempts, and a 3-failure case could not be forced organically in the time available. Reasoned from real per-stage timings instead of guessed: this case trades one extra retrieval+rerank pass (cheap, ~3-5s, reranker calls confirmed fast) for the final-generation LLM call the rescued cases pay (~5-10s) -- so it's expected to land in roughly the same **~35-40s** range already measured, not meaningfully worse. This sits at the edge of, not dramatically past, typical latency-budget concerns for this kind of endpoint -- show a loading state regardless; the rewrite path in particular should not be treated as fast/interactive.\n\n" +
          "**Image-URL staleness caveat -- confirmed NOT relevant as of this write-up.** All 4 documents that had this problem earlier in this session (AISC, SJI, ccd, Hilti EA -- pre-dating this session's storage convention, with `image_path` values under a wiped `/tmp` dir) have been re-ingested under the new convention and image-verified (`200`, real PNG) as of this doc. A corpus-wide check just before writing this spec found **zero** other ACTIVE documents with this problem. One unrelated, pre-existing ACTIVE placeholder row (`dummy_fabricator.pdf`, zero pages, `storagePath=\"dummy_path\"`, predates this session) has no image at all, but it structurally cannot appear in `results[]` (it has no indexed chunks to ever be retrieved) -- flagged separately for corpus cleanup, not a QUERY-response hazard.\n\n" +
          "**`results[].hyperlinks` (added this pass).** Real external hyperlinks found on that page (`{uri, text}[]`), or `null` if none. Checked directly against 8 real corpus documents before building this: only 1 of 8 had any hyperlinks at all (all external -- manufacturer spec-sheet links, legal-notice boilerplate). No internal same-PDF page-jump handling -- confirmed zero real examples. `text` (anchor text) is itself best-effort and can be `null` even when `uri` is present. **`null` for all 15 documents that predate this feature** (checked, not assumed -- see the `null` fields in the `successfulAnswer`/`rewriteRescued`/`ambiguousDeferralStillPossible` examples below, all real captures against pre-existing documents) -- only documents ingested after this shipped can have real values here.\n\n" +
          "**`results[].pageDescription` (added this pass).** 2-3 sentence LLM-generated description of that page (Google-image-search-style caption), or `null`. **FUTURE DOCUMENTS ONLY, by design** -- every page of the documents ingested before this feature shipped stays `null` forever, never backfilled. Also `null` for any future page with zero real text/OCR content (generating from nothing produced a confirmed hallucination during design testing, so those are skipped, not guessed). Real measured generation cost: ~1.19s-2.95s per page (~1.6s average), added at ingestion time, not query time -- does not affect QUERY's own latency.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "projectId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["query"], properties: { query: { type: "string" } } },
            },
          },
        },
        responses: {
          "200": {
            description: "Two real captures below: a successful generation (aiSummary present), and an AMBIGUOUS deferral (aiSummary null, results shown instead).",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    messageId: { type: "string", format: "uuid" },
                    aiSummary: { type: "string", nullable: true },
                    deferralReason: { type: "string", nullable: true },
                    queryRewritten: { type: "boolean", description: "True only when a rewrite candidate actually rescued an AMBIGUOUS/empty original query to CONFIDENT and was used for this answer." },
                    effectiveQuery: { type: "string", nullable: true, description: "The exact rewrite text that produced this answer, or null if no rewrite happened." },
                    results: {
                      type: "array",
                      description: "Deduped by document (best-scoring chunk per document kept), sorted by score descending, capped at 10.",
                      items: {
                        type: "object",
                        properties: {
                          documentId: { type: "string", format: "uuid" },
                          documentName: { type: "string" },
                          documentFamilyId: { type: "string", nullable: true },
                          familyCode: { type: "string", nullable: true },
                          edition: { type: "string", nullable: true },
                          chunkType: { type: "string", enum: ["PROSE", "TABLE", "VISUAL"] },
                          pageStart: { type: "integer" },
                          pageEnd: { type: "integer" },
                          imageUrl: { type: "string", description: "Relative path -- prefix with the base URL. No auth required to fetch it." },
                          score: { type: "number", description: "Reranker cross-encoder score. Not a 0-1 probability -- can be negative. Only meaningful as a relative ranking within one response, not comparable across queries." },
                          isPrimarySource: { type: "boolean", description: "True for the one candidate `aiSummary` (or the deferral) was actually generated/anchored from." },
                          hyperlinks: {
                            type: "array",
                            nullable: true,
                            description: "Real external hyperlinks on this page, or null if none. null for every document that predates this feature.",
                            items: {
                              type: "object",
                              properties: {
                                uri: { type: "string" },
                                text: { type: "string", nullable: true, description: "Best-effort anchor text -- can be null even when uri is present." },
                              },
                            },
                          },
                          pageDescription: { type: "string", nullable: true, description: "2-3 sentence generated page description, or null. Future-documents-only by design -- null for every document ingested before this feature shipped." },
                        },
                      },
                    },
                  },
                },
                examples: {
                  successfulAnswer: {
                    summary: "Real capture -- query: \"hilti expansion anchor embedment depth\" (already CONFIDENT, no rewrite)",
                    value: {
                      messageId: "e7aa7d29-978c-4958-b036-4a0198411e85",
                      aiSummary: "Table 1 —Kwik Bolt TZ Specification Table\n1 The minimum thickness of the fastened part is based on use of the anchor at minimum embedment and is controlled by the length of thread. If a thinner fastening thickness is\nrequired, increase the anchor embedment to suit.\n\nFigure 1 —Kwik Bolt TZ installed\nthread d h t\nanch\nunthr d o h ef h nom h o",
                      deferralReason: null,
                      queryRewritten: false,
                      effectiveQuery: null,
                      results: [
                        { documentId: "1360753c-2396-4a69-b4c7-21fcfd2e2842", documentName: "Expansion_Anchor_(316-327)r021.pdf", documentFamilyId: "HILTI-PTG-2008", familyCode: "HILTI-PTG", edition: "2008", chunkType: "PROSE", pageStart: 5, pageEnd: 5, imageUrl: "/v1/standards/image/1360753c-2396-4a69-b4c7-21fcfd2e2842/5", score: 1.5537109375, isPrimarySource: true, hyperlinks: null, pageDescription: null },
                        { documentId: "ac438ab8-3c4a-45ec-ab74-cbf10580f6d8", documentName: "aisc-14th-edition.pdf", documentFamilyId: "AISC-CM-14", familyCode: "AISC", edition: "14", chunkType: "PROSE", pageStart: 2219, pageEnd: 2219, imageUrl: "/v1/standards/image/ac438ab8-3c4a-45ec-ab74-cbf10580f6d8/2219", score: -4.09765625, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                        { documentId: "7b3f5e0e-553d-45c8-ac5d-4dfa6e48b437", documentName: "completeconnectiondetails-2.pdf", documentFamilyId: "CANAM-SCD-2017", familyCode: "CANAM-SCD", edition: "2017-08", chunkType: "VISUAL", pageStart: 40, pageEnd: 40, imageUrl: "/v1/standards/image/7b3f5e0e-553d-45c8-ac5d-4dfa6e48b437/40", score: -5.75390625, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                        { documentId: "f09a797b-25a6-4065-a29d-9ecc510cfd8e", documentName: "43rd_Edition_Catalog_Final_With_Errata1and2.pdf", documentFamilyId: "SJI-SPEC-43", familyCode: "SJI-SPEC", edition: "43", chunkType: "TABLE", pageStart: 69, pageEnd: 69, imageUrl: "/v1/standards/image/f09a797b-25a6-4065-a29d-9ecc510cfd8e/69", score: -7.125, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                      ],
                    },
                  },
                  rewriteRescued: {
                    summary: "Real capture -- query: \"what is the allowable bolt shear capacity per the steel construction manual\" (graded AMBIGUOUS originally -- same exact query used to be this doc's AMBIGUOUS-deferral example before the rewrite feature existed; now rescued to CONFIDENT). Took 2 rewrite attempts and ~39s wall-clock -- see this endpoint's latency notes above.",
                    value: {
                      messageId: "4edd316c-d2ef-4eb2-a307-f93eb156ba95",
                      aiSummary: "Based on the provided chunks, the permitted bolt shear capacity is given in Table 7-1. The table shows the shear strength of bolts under both ASD (Allowable Stress Design) and LRFD (Load and Resistance Factor Design) criteria for different nominal bolt diameters.\n\nFor example, a 5/8-inch nominal bolt diameter has the following shear strengths:\n- ASD: 27.0 kips for a 5/8-inch nominal diameter\n- LRFD: 40.5 kips for a 5/8-inch nominal diameter\n\nThe specific values can be found by looking at the \"Nominal Bolt Diameter, in.\" column and then the corresponding \"F nv /Ω\" and \"φF nv\" rows for both ASD and LRFD.",
                      deferralReason: null,
                      queryRewritten: true,
                      effectiveQuery: "According to the structural steel fabrication manual, what is the permitted bolt shear capacity?",
                      results: [
                        { documentId: "f09a797b-25a6-4065-a29d-9ecc510cfd8e", documentName: "43rd_Edition_Catalog_Final_With_Errata1and2.pdf", documentFamilyId: "SJI-SPEC-43", familyCode: "SJI-SPEC", edition: "43", chunkType: "PROSE", pageStart: 66, pageEnd: 66, imageUrl: "/v1/standards/image/f09a797b-25a6-4065-a29d-9ecc510cfd8e/66", score: -0.8349609375, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                        { documentId: "ac438ab8-3c4a-45ec-ab74-cbf10580f6d8", documentName: "aisc-14th-edition.pdf", documentFamilyId: "AISC-CM-14", familyCode: "AISC", edition: "14", chunkType: "PROSE", pageStart: 2117, pageEnd: 2117, imageUrl: "/v1/standards/image/ac438ab8-3c4a-45ec-ab74-cbf10580f6d8/2117", score: -1.015625, isPrimarySource: true, hyperlinks: null, pageDescription: null },
                        { documentId: "1360753c-2396-4a69-b4c7-21fcfd2e2842", documentName: "Expansion_Anchor_(316-327)r021.pdf", documentFamilyId: "HILTI-PTG-2008", familyCode: "HILTI-PTG", edition: "2008", chunkType: "TABLE", pageStart: 10, pageEnd: 10, imageUrl: "/v1/standards/image/1360753c-2396-4a69-b4c7-21fcfd2e2842/10", score: -1.4345703125, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                      ],
                    },
                  },
                  hyperlinksAndPageDescription: {
                    summary: "Real capture -- query: \"Weyerhaeuser fire-rated assemblies and sprinkler systems guide TJ-1500 reference\", against a freshly re-ingested TJ-4000.pdf (the one real corpus document confirmed to have hyperlinks). Shows both new fields non-null on the primary source.",
                    value: {
                      messageId: "7089f3d1-bfc7-44d5-9d76-90135213bea8",
                      aiSummary: null,
                      deferralReason: "The retrieved content does not appear to directly answer this query.",
                      queryRewritten: false,
                      effectiveQuery: null,
                      results: [
                        {
                          documentId: "d9621a98-519e-4d95-b251-8659226c2c8c",
                          documentName: "TJ-4000.pdf",
                          documentFamilyId: "TJI-SG-4000",
                          familyCode: "TJI-SG",
                          edition: "4000",
                          chunkType: "VISUAL",
                          pageStart: 3,
                          pageEnd: 3,
                          imageUrl: "/v1/standards/image/d9621a98-519e-4d95-b251-8659226c2c8c/3",
                          score: -0.1636962890625,
                          isPrimarySource: true,
                          hyperlinks: [
                            { uri: "http://www.weyerhaeuser.com/woodproducts/document-library/TJ-1500", text: "Weyerhaeuser Fire-Rated Assemblies and Sprinkler Systems Guide, TJ-1500," },
                            { uri: "http://www.weyerhaeuser.com/woodproducts", text: "weyerhaeuser.com/woodproducts" },
                          ],
                          pageDescription: "This page focuses on fire-safe construction practices, detailing the importance of passive and active fire protection systems, with a specific emphasis on the benefits of automatic fire sprinkler systems and smoke detectors. It includes a section on floor assembly compliance with the 2012 and 2015 International Residential Codes (IRC) for one-hour fire-resistance-rated construction.",
                        },
                      ],
                    },
                  },
                  ambiguousDeferralStillPossible: {
                    summary: "Shape unchanged when no rewrite rescues it (not re-captured fresh this pass -- see this endpoint's description for exactly when this happens)",
                    value: {
                      messageId: "e0aec705-6464-4d0f-97f5-31343deda4fb",
                      aiSummary: null,
                      deferralReason: "Retrieval could not confidently distinguish the best match from close competitors -- showing top candidates instead of a synthesized answer.",
                      queryRewritten: false,
                      effectiveQuery: null,
                      results: [
                        { documentId: "1360753c-2396-4a69-b4c7-21fcfd2e2842", documentName: "Expansion_Anchor_(316-327)r021.pdf", documentFamilyId: "HILTI-PTG-2008", familyCode: "HILTI-PTG", edition: "2008", chunkType: "TABLE", pageStart: 10, pageEnd: 10, imageUrl: "/v1/standards/image/1360753c-2396-4a69-b4c7-21fcfd2e2842/10", score: 1.3466796875, isPrimarySource: true, hyperlinks: null, pageDescription: null },
                        { documentId: "ac438ab8-3c4a-45ec-ab74-cbf10580f6d8", documentName: "aisc-14th-edition.pdf", documentFamilyId: "AISC-CM-14", familyCode: "AISC", edition: "14", chunkType: "PROSE", pageStart: 2159, pageEnd: 2159, imageUrl: "/v1/standards/image/ac438ab8-3c4a-45ec-ab74-cbf10580f6d8/2159", score: 0.63330078125, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                        { documentId: "f09a797b-25a6-4065-a29d-9ecc510cfd8e", documentName: "43rd_Edition_Catalog_Final_With_Errata1and2.pdf", documentFamilyId: "SJI-SPEC-43", familyCode: "SJI-SPEC", edition: "43", chunkType: "PROSE", pageStart: 66, pageEnd: 66, imageUrl: "/v1/standards/image/f09a797b-25a6-4065-a29d-9ecc510cfd8e/66", score: -0.8310546875, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                        { documentId: "7b3f5e0e-553d-45c8-ac5d-4dfa6e48b437", documentName: "completeconnectiondetails-2.pdf", documentFamilyId: "CANAM-SCD-2017", familyCode: "CANAM-SCD", edition: "2017-08", chunkType: "VISUAL", pageStart: 74, pageEnd: 74, imageUrl: "/v1/standards/image/7b3f5e0e-553d-45c8-ac5d-4dfa6e48b437/74", score: -6.375, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                      ],
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Real capture.",
            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" } } }, example: { message: "Query string is required" } } },
          },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/projects/{projectId}/standards/chat/history": {
      get: {
        tags: ["Standards"],
        summary: "Get chat history for a project (Google-style, same shape as QUERY)",
        description:
          "Newest first. Each entry is reconstructed from persisted data to match `POST .../query`'s live response shape exactly (`aiSummary`/`deferralReason`/`results[]`/`queryRewritten`/`effectiveQuery`), not the old per-message/per-answer shape -- `askStandards()` is the sole write path for both endpoints now, so history should look like the thing that created it. See `reconstructHistoryEntry()` in `chatService.ts` for exactly what is and isn't recoverable from persisted data (`results[].score` is always `null` here -- never persisted; `queryRewritten`/`effectiveQuery` are always `false`/`null` -- not persisted either).\n\n" +
          "**Real bug, fixed this pass:** `results[]` here now shows the SAME set of images the original live QUERY response showed (up to 10, deduped by document) -- previously only the actually-cited subset (3, or 1 for a deferral) was persisted, so a query that showed 10 images live showed only 3 (or fewer) in history. `askStandards()` now persists the full `results[]`-equivalent pool as citations at answer-creation time. Confirmed with a real before/after this session: a live query returning 10 images, then this endpoint for that same message returning the identical 10.\n\n" +
          "**`results[].hyperlinks`/`results[].pageDescription` (added this pass), reconstructed via the same batched-lookup mechanism as `documentFamilyId`/`familyCode`/`edition`** -- neither is stored on `StandardChatCitation` either, so `getChatHistory()` runs one more batched query (keyed by `documentId`+`pageNumber`) across the whole history page. Confirmed real with a live before/after this session: a query against a freshly re-ingested document (real hyperlinks + a real generated description) showed byte-identical `hyperlinks`/`pageDescription` values here as the original live QUERY response for that same message -- see the `hyperlinksAndPageDescription` example below. `null` for every document that predates these features, same as every other pre-existing document in this response.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Real capture (3 entries shown below, not the whole history; a real call returns every message for the project) -- the first entry is the exact before/after test proving the citation-truncation fix: 10 results, matching a live QUERY call to this same message moments earlier. The third entry is the exact before/after test for hyperlinks/pageDescription: real, non-null values matching a live QUERY call to this same message moments earlier.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      messageId: { type: "string", format: "uuid" },
                      queryText: { type: "string" },
                      createdAt: { type: "string", format: "date-time" },
                      aiSummary: { type: "string", nullable: true },
                      deferralReason: { type: "string", nullable: true },
                      queryRewritten: { type: "boolean", description: "Always false here -- not persisted, see description above." },
                      effectiveQuery: { type: "string", nullable: true, description: "Always null here -- not persisted, see description above." },
                      results: {
                        type: "array",
                        description: "Same shape as QUERY's results[], except score is always null (never persisted).",
                        items: {
                          type: "object",
                          properties: {
                            documentId: { type: "string", format: "uuid" },
                            documentName: { type: "string" },
                            documentFamilyId: { type: "string", nullable: true },
                            familyCode: { type: "string", nullable: true },
                            edition: { type: "string", nullable: true },
                            chunkType: { type: "string", enum: ["PROSE", "TABLE", "VISUAL"] },
                            pageStart: { type: "integer" },
                            pageEnd: { type: "integer" },
                            imageUrl: { type: "string" },
                            score: { type: "number", nullable: true, description: "Always null -- never persisted on StandardChatCitation." },
                            isPrimarySource: { type: "boolean" },
                            hyperlinks: {
                              type: "array",
                              nullable: true,
                              description: "Real external hyperlinks on this page, reconstructed from standard_pages -- null for every document that predates this feature.",
                              items: { type: "object", properties: { uri: { type: "string" }, text: { type: "string", nullable: true } } },
                            },
                            pageDescription: { type: "string", nullable: true, description: "Reconstructed from standard_pages -- null for every document that predates this feature." },
                          },
                        },
                      },
                    },
                  },
                },
                example: [
                  {
                    messageId: "b50b3cf4-245c-4c64-bf09-736bb261a8e5",
                    queryText: "steel joist load table",
                    createdAt: "2026-09-16T08:06:55.320Z",
                    aiSummary: "The Load Table provides the TOTAL safe factored uniformly distributed load-carrying capacities, in pounds per linear foot, of LRFD and ASD LH-Series Steel Joists.",
                    deferralReason: null,
                    queryRewritten: false,
                    effectiveQuery: null,
                    results: [
                      { documentId: "f09a797b-25a6-4065-a29d-9ecc510cfd8e", documentName: "43rd_Edition_Catalog_Final_With_Errata1and2.pdf", documentFamilyId: "SJI-SPEC-43", familyCode: "SJI-SPEC", edition: "43", chunkType: "PROSE", pageStart: 116, pageEnd: 116, imageUrl: "/v1/standards/image/f09a797b-25a6-4065-a29d-9ecc510cfd8e/116", score: null, isPrimarySource: true, hyperlinks: null, pageDescription: null },
                      { documentId: "43b824ba-ceca-46d6-ac55-d185f99a6a69", documentName: "NewmillCatalog.pdf", documentFamilyId: "NMBS-JC-2007", familyCode: "NMBS-JC", edition: "2007", chunkType: "PROSE", pageStart: 65, pageEnd: 65, imageUrl: "/v1/standards/image/43b824ba-ceca-46d6-ac55-d185f99a6a69/65", score: null, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                      { documentId: "08a0558f-d0de-40c4-a019-524b2d34b3eb", documentName: "NASCC2007-SafeHandlePaper_15Jan07.pdf", documentFamilyId: "NASCC-SHP-2007", familyCode: "NASCC-SHP", edition: "2007", chunkType: "PROSE", pageStart: 4, pageEnd: 4, imageUrl: "/v1/standards/image/08a0558f-d0de-40c4-a019-524b2d34b3eb/4", score: null, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                      { documentId: "96be6053-ce36-413b-b46f-879803a186f7", documentName: "canam-joist-catalog.pdf", documentFamilyId: "CANAM-JC-42", familyCode: "CANAM-JC", edition: "42", chunkType: "TABLE", pageStart: 54, pageEnd: 54, imageUrl: "/v1/standards/image/96be6053-ce36-413b-b46f-879803a186f7/54", score: null, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                      { documentId: "2090e686-90d2-4da2-b7aa-6db260f5c6b0", documentName: "steeljoists-sec5.pdf", documentFamilyId: "SJI-COSP-2012", familyCode: "SJI-COSP", edition: "2012", chunkType: "PROSE", pageStart: 21, pageEnd: 21, imageUrl: "/v1/standards/image/2090e686-90d2-4da2-b7aa-6db260f5c6b0/21", score: null, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                      { documentId: "30f68f10-3565-49ce-88f3-0a561f47b0e4", documentName: "steeljoists-sec1.pdf", documentFamilyId: "SJI-DG-2014", familyCode: "SJI-DG", edition: "2014", chunkType: "PROSE", pageStart: 1, pageEnd: 1, imageUrl: "/v1/standards/image/30f68f10-3565-49ce-88f3-0a561f47b0e4/1", score: null, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                      { documentId: "5e0f1884-1838-4027-892e-7ea1a9f0f38e", documentName: "TJ-4000.pdf", documentFamilyId: "TJI-SG-4000", familyCode: "TJI-SG", edition: "4000", chunkType: "PROSE", pageStart: 13, pageEnd: 13, imageUrl: "/v1/standards/image/5e0f1884-1838-4027-892e-7ea1a9f0f38e/13", score: null, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                      { documentId: "4892d2fb-44db-40e8-8080-cf22f7a15b97", documentName: "Wood-Beam-Joists-Specs.pdf", documentFamilyId: "WIB-JS-GPI", familyCode: "WIB-JS", edition: "1", chunkType: "TABLE", pageStart: 19, pageEnd: 19, imageUrl: "/v1/standards/image/4892d2fb-44db-40e8-8080-cf22f7a15b97/19", score: null, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                      { documentId: "ac438ab8-3c4a-45ec-ab74-cbf10580f6d8", documentName: "aisc-14th-edition.pdf", documentFamilyId: "AISC-CM-14", familyCode: "AISC", edition: "14", chunkType: "PROSE", pageStart: 165, pageEnd: 165, imageUrl: "/v1/standards/image/ac438ab8-3c4a-45ec-ab74-cbf10580f6d8/165", score: null, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                      { documentId: "5e14120e-7676-44d9-beaa-c62a0bc6692b", documentName: "steel joists. - 1926.pdf", documentFamilyId: "SJI-SPT-1926", familyCode: "SJI-SPT", edition: "1926", chunkType: "PROSE", pageStart: 4, pageEnd: 4, imageUrl: "/v1/standards/image/5e14120e-7676-44d9-beaa-c62a0bc6692b/4", score: null, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                    ],
                  },
                  {
                    messageId: "dadcfd9e-cf77-4c16-970e-d92fc17ee7d5",
                    queryText: "specification table",
                    createdAt: "2026-09-15T13:47:30.901Z",
                    aiSummary: null,
                    deferralReason: "The retrieved content does not appear to directly answer this query.",
                    queryRewritten: false,
                    effectiveQuery: null,
                    results: [
                      { documentId: "ac438ab8-3c4a-45ec-ab74-cbf10580f6d8", documentName: "aisc-14th-edition.pdf", documentFamilyId: "AISC-CM-14", familyCode: "AISC", edition: "14", chunkType: "TABLE", pageStart: 191, pageEnd: 191, imageUrl: "/v1/standards/image/ac438ab8-3c4a-45ec-ab74-cbf10580f6d8/191", score: null, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                      { documentId: "ac438ab8-3c4a-45ec-ab74-cbf10580f6d8", documentName: "aisc-14th-edition.pdf", documentFamilyId: "AISC-CM-14", familyCode: "AISC", edition: "14", chunkType: "TABLE", pageStart: 1766, pageEnd: 1766, imageUrl: "/v1/standards/image/ac438ab8-3c4a-45ec-ab74-cbf10580f6d8/1766", score: null, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                      { documentId: "ac438ab8-3c4a-45ec-ab74-cbf10580f6d8", documentName: "aisc-14th-edition.pdf", documentFamilyId: "AISC-CM-14", familyCode: "AISC", edition: "14", chunkType: "PROSE", pageStart: 1487, pageEnd: 1487, imageUrl: "/v1/standards/image/ac438ab8-3c4a-45ec-ab74-cbf10580f6d8/1487", score: null, isPrimarySource: false, hyperlinks: null, pageDescription: null },
                    ],
                  },
                  {
                    messageId: "7089f3d1-bfc7-44d5-9d76-90135213bea8",
                    queryText: "Weyerhaeuser fire-rated assemblies and sprinkler systems guide TJ-1500 reference",
                    createdAt: "2026-09-17T09:12:00.000Z",
                    aiSummary: null,
                    deferralReason: "The retrieved content does not appear to directly answer this query.",
                    queryRewritten: false,
                    effectiveQuery: null,
                    results: [
                      {
                        documentId: "d9621a98-519e-4d95-b251-8659226c2c8c",
                        documentName: "TJ-4000.pdf",
                        documentFamilyId: "TJI-SG-4000",
                        familyCode: "TJI-SG",
                        edition: "4000",
                        chunkType: "VISUAL",
                        pageStart: 3,
                        pageEnd: 3,
                        imageUrl: "/v1/standards/image/d9621a98-519e-4d95-b251-8659226c2c8c/3",
                        score: null,
                        isPrimarySource: true,
                        hyperlinks: [
                          { uri: "http://www.weyerhaeuser.com/woodproducts/document-library/TJ-1500", text: "Weyerhaeuser Fire-Rated Assemblies and Sprinkler Systems Guide, TJ-1500," },
                          { uri: "http://www.weyerhaeuser.com/woodproducts", text: "weyerhaeuser.com/woodproducts" },
                        ],
                        pageDescription: "This page focuses on fire-safe construction practices, detailing the importance of passive and active fire protection systems, with a specific emphasis on the benefits of automatic fire sprinkler systems and smoke detectors. It includes a section on floor assembly compliance with the 2012 and 2015 International Residential Codes (IRC) for one-hour fire-resistance-rated construction.",
                      },
                    ],
                  },
                ],
              },
            },
          },
          "401": {
            description: "Unauthorized - missing or invalid authentication token",
          },
          "500": {
            description: "Internal server error",
          }
        },
      },
    },
  },
};

export default standards_doc;
