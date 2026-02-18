import { ModuleOpenApiDoc } from "../../openapi/types";

export const communicationsOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Communications",
    description: "API endpoints for Communications module"
  },
  paths: {
    "/communications": {
      get: {
        tags: ["Communications"],
        summary: "GET /communications",
        operationId: "get_communications_communications",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      post: {
        tags: ["Communications"],
        summary: "POST /communications",
        operationId: "post_communications_communications",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  projectId: { type: "string", format: "uuid" },
                  fabricatorId: { type: "string", format: "uuid", nullable: true },
                  clientName: { type: "string" },
                  communicationDate: { type: "string", format: "date-time" },
                  followUpDate: { type: "string", format: "date-time" },
                  isCompleted: { type: "boolean" },
                  subject: { type: "string", nullable: true },
                  notes: { type: "string" },
                  reminderSent: { type: "boolean" }
                },
                required: ["projectId", "clientName", "followUpDate", "notes"]
              }
            }
          }
        },
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/communications/complete/{id}": {
      patch: {
        tags: ["Communications"],
        summary: "PATCH /communications/complete/{id}",
        operationId: "patch_communications_communications_complete_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  projectId: { type: "string", format: "uuid" },
                  fabricatorId: { type: "string", format: "uuid", nullable: true },
                  clientName: { type: "string" },
                  communicationDate: { type: "string", format: "date-time" },
                  followUpDate: { type: "string", format: "date-time" },
                  isCompleted: { type: "boolean" },
                  subject: { type: "string", nullable: true },
                  notes: { type: "string" },
                  reminderSent: { type: "boolean" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/communications/{id}": {
      patch: {
        tags: ["Communications"],
        summary: "PATCH /communications/{id}",
        operationId: "patch_communications_communications_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/communications/dashboard/my-followups": {
      get: {
        tags: ["Communications"],
        summary: "GET /communications/dashboard/my-followups",
        operationId: "get_communications_communications_dashboard_my_followups",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
  }
};

export default communicationsOpenApiDoc;
