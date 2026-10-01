import { ModuleOpenApiDoc } from "../../openapi/types";

export const wprOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "WPR",
    description: "API endpoints for Weekly Progress Reports (WPR)",
  },
  paths: {
    "/wpr/projects/{projectId}/weeks": {
      get: {
        tags: ["WPR"],
        summary: "Get project report weeks (nothing-stored)",
        description:
          "Calculates and returns the list of reporting weeks (Monday–Sunday) for a project dynamically from its timeline (e.g. estimate/target completion date or created date) up to the current week in the configured WPR timezone. Nothing is stored in the database for this endpoint — calculated dynamically on the fly.",
        operationId: "getWprProjectWeeks",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "projectId",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID of the project",
          },
        ],
        responses: {
          "200": {
            description: "Calculated weeks retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          index: { type: "integer", example: 1 },
                          label: { type: "string", example: "Week 1 (Oct 04)" },
                          start: {
                            type: "string",
                            format: "date-time",
                            description: "Monday start of the week (UTC instant)",
                          },
                          end: {
                            type: "string",
                            format: "date-time",
                            description: "Sunday end of the week (UTC instant)",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Bad Request - Invalid UUID" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden - User lacks access to this project" },
          "404": { description: "Project not found" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/wpr/projects/{projectId}/report.pdf": {
      get: {
        tags: ["WPR"],
        summary: "Download Weekly Progress Report PDF (nothing-stored)",
        description:
          "Generates and streams a Weekly Progress Report (WPR) PDF on demand for the specified project and optional week ending date (snapped to that week's Sunday). Nothing is stored or cached on disk/DB — the PDF is generated in-memory and streamed directly as an attachment. Single-concurrency guard per process prevents memory spikes (returns 429 if concurrency queue times out).",
        operationId: "getWprReportPdf",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "projectId",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID of the project",
          },
          {
            in: "query",
            name: "weekEnding",
            required: false,
            schema: { type: "string", example: "2026-10-04" },
            description:
              "Optional YYYY-MM-DD date. Snapped to that week's Sunday in the WPR timezone (defaults to current week's Sunday).",
          },
        ],
        responses: {
          "200": {
            description: "PDF report generated and streamed successfully",
            headers: {
              "Content-Disposition": {
                schema: { type: "string" },
                description: 'attachment; filename="WPR_<Project>_<Date>.pdf"',
              },
              "Content-Length": {
                schema: { type: "integer" },
                description: "Length of the PDF binary buffer in bytes",
              },
            },
            content: {
              "application/pdf": {
                schema: {
                  type: "string",
                  format: "binary",
                },
              },
            },
          },
          "400": { description: "Bad Request - Invalid projectId or weekEnding format" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden - User lacks access to this project" },
          "404": { description: "Project not found" },
          "429": { description: "Too Many Requests - Another WPR report is currently generating" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/wpr/projects/{projectId}/report.json": {
      get: {
        tags: ["WPR"],
        summary: "Get Weekly Progress Report data as JSON (nothing-stored)",
        description:
          "Assembles and returns Weekly Progress Report data (RFIs, Schedule/Milestones/Submittals, Change Orders) as JSON for the specified week. Assembled dynamically on the fly from current project records; nothing is persisted.",
        operationId: "getWprReportJson",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "projectId",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID of the project",
          },
          {
            in: "query",
            name: "weekEnding",
            required: false,
            schema: { type: "string", example: "2026-10-04" },
            description:
              "Optional YYYY-MM-DD date. Snapped to that week's Sunday in the WPR timezone (defaults to current week's Sunday).",
          },
        ],
        responses: {
          "200": {
            description: "Assembled report JSON data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    data: {
                      type: "object",
                      properties: {
                        meta: { type: "object" },
                        rfi: { type: "array", items: { type: "object" } },
                        schedule: { type: "array", items: { type: "object" } },
                        changeOrders: { type: "array", items: { type: "object" } },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Bad Request - Invalid projectId or weekEnding format" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden - User lacks access to this project" },
          "404": { description: "Project not found" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/wpr/deliveries": {
      get: {
        tags: ["WPR"],
        summary: "List WPR automated deliveries",
        description: "Retrieves a paginated list of automated Weekly Progress Report email delivery logs.",
        operationId: "listWprDeliveries",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "fabricatorId",
            required: false,
            schema: { type: "string", format: "uuid" },
            description: "Filter deliveries by fabricator ID",
          },
          {
            in: "query",
            name: "projectId",
            required: false,
            schema: { type: "string", format: "uuid" },
            description: "Filter deliveries by project ID",
          },
          {
            in: "query",
            name: "status",
            required: false,
            schema: { type: "string", enum: ["PENDING", "SENT", "FAILED", "SKIPPED"] },
            description: "Filter deliveries by status",
          },
          {
            in: "query",
            name: "page",
            required: false,
            schema: { type: "integer", default: 1, minimum: 1 },
            description: "Page number",
          },
          {
            in: "query",
            name: "limit",
            required: false,
            schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
            description: "Items per page",
          },
        ],
        responses: {
          "200": {
            description: "Paginated delivery records retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    data: { type: "array", items: { type: "object" } },
                    meta: { type: "object" },
                  },
                },
              },
            },
          },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
  },
};

export default wprOpenApiDoc;
