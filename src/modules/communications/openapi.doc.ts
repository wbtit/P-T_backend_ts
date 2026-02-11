import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";

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
        requestBody: genericRequestBody,
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
        requestBody: genericRequestBody,
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
        requestBody: genericRequestBody,
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
