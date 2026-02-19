import { ModuleOpenApiDoc } from "../../openapi/types";
import { zodRequestBody } from "../../openapi/zod";
import { createSubmittalsDto, createSubmittalsResponseDto } from "./dtos";
import z from "zod";

export const submittalsOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Submittals",
    description: "API endpoints for Submittals module"
  },
  paths: {
    "/submittal/pendingSubmittal": {
      get: {
        tags: ["Submittals"],
        summary: "GET /submittal/pendingSubmittal",
        operationId: "get_submittals_submittal_pendingSubmittal",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/submittal/pending/projectManager": {
      get: {
        tags: ["Submittals"],
        summary: "GET /submittal/pending/projectManager",
        operationId: "get_submittals_submittal_pending_projectManager",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/submittal/pending/clientAdmin": {
      get: {
        tags: ["Submittals"],
        summary: "GET /submittal/pending/clientAdmin",
        operationId: "get_submittals_submittal_pending_clientAdmin",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/submittal": {
      post: {
        tags: ["Submittals"],
        summary: "POST /submittal",
        operationId: "post_submittals_submittal",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createSubmittalsDto),
        responses: {
          "201": { description: "Created" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/submittal/project/{projectId}": {
      get: {
        tags: ["Submittals"],
        summary: "GET /submittal/project/{projectId}",
        operationId: "get_submittals_submittal_project_projectId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/submittal/received": {
      get: {
        tags: ["Submittals"],
        summary: "GET /submittal/received",
        operationId: "get_submittals_submittal_received",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/submittal/response/{responseId}/viewFile/{fileId}": {
      get: {
        tags: ["Submittals"],
        summary: "GET /submittal/response/{responseId}/viewFile/{fileId}",
        operationId: "get_submittals_submittal_response_responseId_viewFile_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "responseId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/submittal/responses": {
      post: {
        tags: ["Submittals"],
        summary: "POST /submittal/responses",
        operationId: "post_submittals_submittal_responses",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createSubmittalsResponseDto),
        responses: {
          "201": { description: "Created" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/submittal/responses/{id}": {
      get: {
        tags: ["Submittals"],
        summary: "GET /submittal/responses/{id}",
        operationId: "get_submittals_submittal_responses_id",
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
    "/submittal/responses/{parentResponseId}/status": {
      patch: {
        tags: ["Submittals"],
        summary: "PATCH /submittal/responses/{parentResponseId}/status",
        operationId: "patch_submittals_submittal_responses_parentResponseId_status",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "parentResponseId", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(
          z.object({
            status: z.string(),
          })
        ),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/submittal/sent": {
      get: {
        tags: ["Submittals"],
        summary: "GET /submittal/sent",
        operationId: "get_submittals_submittal_sent",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/submittal/{id}": {
      get: {
        tags: ["Submittals"],
        summary: "GET /submittal/{id}",
        operationId: "get_submittals_submittal_id",
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
    "/submittal/{id}/versions": {
      post: {
        tags: ["Submittals"],
        summary: "POST /submittal/{id}/versions",
        operationId: "post_submittals_submittal_id_versions",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(
          z.object({
            description: z.string().min(1),
          })
        ),
        responses: {
          "201": { description: "Created" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/submittal/{submittalId}/versions/{versionId}/{fileId}": {
      get: {
        tags: ["Submittals"],
        summary: "GET /submittal/{submittalId}/versions/{versionId}/{fileId}",
        operationId: "get_submittals_submittal_submittalId_versions_versionId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "submittalId", required: true, schema: { type: "string" } },
          { in: "path", name: "versionId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
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

export default submittalsOpenApiDoc;
