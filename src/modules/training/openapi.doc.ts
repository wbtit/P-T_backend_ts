import { ModuleOpenApiDoc } from "../../openapi/types";
import { zodRequestBody } from "../../openapi/zod";
import { 
  raiseTrainingRequestDto, 
  approveTrainingRequestDto, 
  rejectTrainingRequestDto, 
  createTrainingBatchDto 
} from "./training.dto";

export const trainingOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Training",
    description: "API endpoints for Training Request and Batch module"
  },
  paths: {
    "/training/request": {
      post: {
        tags: ["Training"],
        summary: "POST /training/request",
        operationId: "post_training_request",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(raiseTrainingRequestDto),
        responses: {
          "201": { description: "Created" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      }
    },
    "/training/pending": {
      get: {
        tags: ["Training"],
        summary: "GET /training/pending",
        operationId: "get_training_pending",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "500": { description: "Internal Server Error" }
        }
      }
    },
    "/training/requests": {
      get: {
        tags: ["Training"],
        summary: "GET /training/requests",
        operationId: "get_training_requests",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "query", name: "status", required: false, schema: { type: "string" }, description: "Comma-separated statuses to filter by (e.g. APPROVED,REJECTED,PENDING)" }
        ],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "500": { description: "Internal Server Error" }
        }
      }
    },
    "/training/{requestId}/approve": {
      patch: {
        tags: ["Training"],
        summary: "PATCH /training/{requestId}/approve",
        operationId: "patch_training_requestId_approve",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "requestId", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: zodRequestBody(approveTrainingRequestDto),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "404": { description: "Not Found" },
          "409": { description: "Conflict" },
          "500": { description: "Internal Server Error" }
        }
      }
    },
    "/training/{requestId}/reject": {
      patch: {
        tags: ["Training"],
        summary: "PATCH /training/{requestId}/reject",
        operationId: "patch_training_requestId_reject",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "requestId", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: zodRequestBody(rejectTrainingRequestDto),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "404": { description: "Not Found" },
          "409": { description: "Conflict" },
          "500": { description: "Internal Server Error" }
        }
      }
    },
    "/training/{taskId}/variance": {
      get: {
        tags: ["Training"],
        summary: "GET /training/{taskId}/variance",
        operationId: "get_training_taskId_variance",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "taskId", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      }
    },
    "/training/batches/suggest": {
      get: {
        tags: ["Training"],
        summary: "GET /training/batches/suggest",
        operationId: "get_training_batches_suggest",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "query", name: "departmentId", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "500": { description: "Internal Server Error" }
        }
      }
    },
    "/training/batches": {
      post: {
        tags: ["Training"],
        summary: "POST /training/batches",
        operationId: "post_training_batches",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createTrainingBatchDto),
        responses: {
          "201": { description: "Created" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "404": { description: "Not Found" },
          "409": { description: "Conflict" },
          "500": { description: "Internal Server Error" }
        }
      },
      get: {
        tags: ["Training"],
        summary: "GET /training/batches",
        operationId: "get_training_batches",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "500": { description: "Internal Server Error" }
        }
      }
    },
    "/training/batches/mine": {
      get: {
        tags: ["Training"],
        summary: "GET /training/batches/mine",
        operationId: "get_training_batches_mine",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      }
    },
    "/training/batches/{batchId}/complete": {
      patch: {
        tags: ["Training"],
        summary: "PATCH /training/batches/{batchId}/complete",
        operationId: "patch_training_batches_batchId_complete",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "batchId", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "404": { description: "Not Found" },
          "409": { description: "Conflict" },
          "500": { description: "Internal Server Error" }
        }
      }
    }
  }
};

export default trainingOpenApiDoc;
