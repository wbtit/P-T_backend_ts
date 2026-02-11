import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { CreateRfqSchema, UpdateRfqSchema } from "./dtos";
import { RfqResponseSchema } from "./RFQresponse";

export const rFQOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "RFQ",
    description: "API endpoints for RFQ module"
  },
  paths: {
    "/rfq": {
      post: {
        tags: ["RFQ"],
        summary: "POST /rfq",
        operationId: "post_RFQ_rfq",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(CreateRfqSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/all": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/all",
        operationId: "get_RFQ_rfq_all",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/connectionEngineers": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/connectionEngineers",
        operationId: "get_RFQ_rfq_connectionEngineers",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/delete/{id}": {
      delete: {
        tags: ["RFQ"],
        summary: "DELETE /rfq/delete/{id}",
        operationId: "delete_RFQ_rfq_delete_id",
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
    "/rfq/getById/{id}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/getById/{id}",
        operationId: "get_RFQ_rfq_getById_id",
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
    "/rfq/pendingRFQs": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/pendingRFQs",
        operationId: "get_RFQ_rfq_pendingRFQs",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/received": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/received",
        operationId: "get_RFQ_rfq_received",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/response/viewFile/{rfqResId}/{fileId}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/response/viewFile/{rfqResId}/{fileId}",
        operationId: "get_RFQ_rfq_response_viewFile_rfqResId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfqResId", required: true, schema: { type: "string" } },
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
    "/rfq/responses/{id}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/responses/{id}",
        operationId: "get_RFQ_rfq_responses_id",
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
    "/rfq/responses/{rfqResId}/files/{fileId}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/responses/{rfqResId}/files/{fileId}",
        operationId: "get_RFQ_rfq_responses_rfqResId_files_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfqResId", required: true, schema: { type: "string" } },
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
    "/rfq/sents": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/sents",
        operationId: "get_RFQ_rfq_sents",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/update/{id}": {
      put: {
        tags: ["RFQ"],
        summary: "PUT /rfq/update/{id}",
        operationId: "put_RFQ_rfq_update_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateRfqSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/viewFile/{rfqId}/{fileId}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/viewFile/{rfqId}/{fileId}",
        operationId: "get_RFQ_rfq_viewFile_rfqId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfqId", required: true, schema: { type: "string" } },
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
    "/rfq/{id}": {
      delete: {
        tags: ["RFQ"],
        summary: "DELETE /rfq/{id}",
        operationId: "delete_RFQ_rfq_id",
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
    "/rfq/{rfqId}/files/{fileId}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/{rfqId}/files/{fileId}",
        operationId: "get_RFQ_rfq_rfqId_files_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfqId", required: true, schema: { type: "string" } },
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

export default rFQOpenApiDoc;
