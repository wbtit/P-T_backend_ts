import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";

export const notificationsOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Notifications",
    description: "API endpoints for Notifications module"
  },
  paths: {
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "GET /notifications",
        operationId: "get_notifications_notifications",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/notifications/read/{notificationId}": {
      patch: {
        tags: ["Notifications"],
        summary: "PATCH /notifications/read/{notificationId}",
        operationId: "patch_notifications_notifications_read_notificationId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "notificationId", required: true, schema: { type: "string" } },
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

export default notificationsOpenApiDoc;
