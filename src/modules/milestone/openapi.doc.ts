import { ModuleOpenApiDoc } from "../../openapi/types";
import { zodRequestBody } from "../../openapi/zod";
import { createMileStoneSchema, updateMileStoneSchema } from "./dtos";

export const milestoneOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Milestone",
    description: "API endpoints for Milestone module"
  },
  paths: {
    "/mileStone": {
      get: {
        tags: ["Milestone"],
        summary: "Get all milestones",
        operationId: "get_milestone_all",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      post: {
        tags: ["Milestone"],
        summary: "Create milestone",
        operationId: "post_milestone_create",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createMileStoneSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/mileStone/pendingSubmittals": {
      get: {
        tags: ["Milestone"],
        summary: "Get pending submittals",
        operationId: "get_milestone_pending_submittals",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/mileStone/pendingSubmittals/clientAdmin": {
      get: {
        tags: ["Milestone"],
        summary: "Get pending submittals for client admin",
        operationId: "get_milestone_pending_submittals_client_admin",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/mileStone/pendingSubmittals/client": {
      get: {
        tags: ["Milestone"],
        summary: "Get pending submittals for client",
        operationId: "get_milestone_pending_submittals_client",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/mileStone/{id}": {
      get: {
        tags: ["Milestone"],
        summary: "Get milestone by id",
        operationId: "get_milestone_by_id",
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
      put: {
        tags: ["Milestone"],
        summary: "Update milestone by id (creates new version)",
        operationId: "put_milestone_by_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(updateMileStoneSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      delete: {
        tags: ["Milestone"],
        summary: "Delete milestone by id",
        operationId: "delete_milestone_by_id",
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
    "/mileStone/completion/{id}": {
      put: {
        tags: ["Milestone"],
        summary: "Update milestone completion status by id",
        operationId: "put_milestone_completion_by_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(updateMileStoneSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/mileStone/project/{id}": {
      get: {
        tags: ["Milestone"],
        summary: "Get milestones by project id",
        operationId: "get_milestone_by_project_id",
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
  }
};

export default milestoneOpenApiDoc;
