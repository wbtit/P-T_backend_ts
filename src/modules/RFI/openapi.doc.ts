import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { RFIResponseSchema, RFISchema, UpdateRFISchema } from "./dtos";

export const rFIOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "RFI",
    description: "API endpoints for RFI module"
  },
  paths: {
    "/rfi": {
      post: {
        tags: ["RFI"],
        summary: "POST /rfi",
        operationId: "post_RFI_rfi",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(RFISchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfi/getById/{id}": {
      get: {
        tags: ["RFI"],
        summary: "GET /rfi/getById/{id}",
        operationId: "get_RFI_rfi_getById_id",
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
    "/rfi/pendingRFIs": {
      get: {
        tags: ["RFI"],
        summary: "GET /rfi/pendingRFIs",
        operationId: "get_RFI_rfi_pendingRFIs",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfi/received": {
      get: {
        tags: ["RFI"],
        summary: "GET /rfi/received",
        operationId: "get_RFI_rfi_received",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfi/response/viewFile/{rfiResId}/{fileId}": {
      get: {
        tags: ["RFI"],
        summary: "GET /rfi/response/viewFile/{rfiResId}/{fileId}",
        operationId: "get_RFI_rfi_response_viewFile_rfiResId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfiResId", required: true, schema: { type: "string" } },
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
    "/rfi/responses/{id}": {
      get: {
        tags: ["RFI"],
        summary: "GET /rfi/responses/{id}",
        operationId: "get_RFI_rfi_responses_id",
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
    "/rfi/responses/{rfiResId}/files/{fileId}": {
      get: {
        tags: ["RFI"],
        summary: "GET /rfi/responses/{rfiResId}/files/{fileId}",
        operationId: "get_RFI_rfi_responses_rfiResId_files_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfiResId", required: true, schema: { type: "string" } },
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
    "/rfi/sents": {
      get: {
        tags: ["RFI"],
        summary: "GET /rfi/sents",
        operationId: "get_RFI_rfi_sents",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfi/{id}": {
      delete: {
        tags: ["RFI"],
        summary: "DELETE /rfi/{id}",
        operationId: "delete_RFI_rfi_id",
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
        tags: ["RFI"],
        summary: "PUT /rfi/{id}",
        operationId: "put_RFI_rfi_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateRFISchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfi/{rfiId}/files/{fileId}": {
      get: {
        tags: ["RFI"],
        summary: "GET /rfi/{rfiId}/files/{fileId}",
        operationId: "get_RFI_rfi_rfiId_files_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfiId", required: true, schema: { type: "string" } },
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
    "/rfi/{rfiId}/responses": {
      post: {
        tags: ["RFI"],
        summary: "POST /rfi/{rfiId}/responses",
        operationId: "post_RFI_rfi_rfiId_responses",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfiId", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(RFIResponseSchema),
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

export default rFIOpenApiDoc;
