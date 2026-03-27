import { ModuleOpenApiDoc } from "../../openapi/types";
import { zodRequestBody } from "../../openapi/zod";
import {
  createMileStoneSchema,
  createMileStoneResponseSchema,
  updateMileStoneResponseStatusSchema,
  updateMileStoneSchema,
} from "./dtos";
import z from "zod";

const milestoneUpdateRequestBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        oneOf: [
          z.toJSONSchema(updateMileStoneSchema, {
            io: "input",
            unrepresentable: "any",
          }),
          {
            type: "object",
            properties: {
              data: z.toJSONSchema(updateMileStoneSchema, {
                io: "input",
                unrepresentable: "any",
              }),
            },
            required: ["data"],
          },
        ],
      },
    },
  },
};

const milestoneCompletionRequestBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        oneOf: [
          {
            type: "object",
            properties: {
              completeionPercentage: {
                type: "number",
                minimum: 0,
                maximum: 100,
              },
            },
            required: ["completeionPercentage"],
          },
          {
            type: "object",
            properties: {
              data: {
                type: "object",
                properties: {
                  completeionPercentage: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                  },
                },
                required: ["completeionPercentage"],
              },
            },
            required: ["data"],
          },
        ],
      },
    },
  },
};

const milestoneResponseMultipartRequestBody = {
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        properties: {
          mileStoneId: { type: "string" },
          mileStoneVersionId: { type: "string", format: "uuid" },
          parentResponseId: { type: "string", format: "uuid" },
          description: { type: "string" },
          status: {
            type: "string",
            enum: ["PENDING", "APPROVED", "REJECTED", "DELAYED"],
          },
          files: {
            type: "array",
            items: { type: "string", format: "binary" },
          },
        },
        required: ["mileStoneId", "mileStoneVersionId"],
      },
    },
    "application/json": {
      schema: z.toJSONSchema(createMileStoneResponseSchema, {
        io: "input",
        unrepresentable: "any",
      }),
    },
  },
};

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
          "201": { description: "Created" },
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
    "/mileStone/pendingSubmittals/projectManager": {
      get: {
        tags: ["Milestone"],
        summary: "Get pending submittals for project manager",
        operationId: "get_milestone_pending_submittals_project_manager",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/mileStone/pendingSubmittals/connectionDesignerEngineer": {
      get: {
        tags: ["Milestone"],
        summary: "Get pending submittals for connection designer engineer",
        operationId: "get_milestone_pending_submittals_connection_designer_engineer",
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
        requestBody: milestoneUpdateRequestBody,
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
        requestBody: milestoneCompletionRequestBody,
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/mileStone/existing/{id}": {
      put: {
        tags: ["Milestone"],
        summary: "Update existing milestone by id (without creating version)",
        operationId: "put_milestone_existing_by_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: milestoneUpdateRequestBody,
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
    "/mileStone/responses": {
      post: {
        tags: ["Milestone"],
        summary: "Create milestone response (version-aware)",
        operationId: "post_milestone_responses",
        security: [{ bearerAuth: [] }],
        requestBody: milestoneResponseMultipartRequestBody,
        responses: {
          "201": { description: "Created" },
          "404": { description: "Milestone or version not found" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/mileStone/responses/{parentResponseId}/status": {
      patch: {
        tags: ["Milestone"],
        summary: "Update milestone response thread status",
        operationId: "patch_milestone_responses_parentResponseId_status",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "parentResponseId", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(updateMileStoneResponseStatusSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "Milestone response not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/mileStone/responses/{id}": {
      get: {
        tags: ["Milestone"],
        summary: "Get milestone response by id",
        operationId: "get_milestone_responses_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "Milestone response not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/mileStone/response/{responseId}/viewFile/{fileId}": {
      get: {
        tags: ["Milestone"],
        summary: "View milestone response file",
        operationId: "get_milestone_response_responseId_viewFile_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "responseId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "Response or file not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
  }
};

export default milestoneOpenApiDoc;
