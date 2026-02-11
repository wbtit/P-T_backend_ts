import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { ConnectionDesignerQuotaSchema, updateConnectionDesignerQuotaSchema } from "./dtos";

export const connectionDesignOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "ConnectionDesign",
    description: "API endpoints for ConnectionDesign module"
  },
  paths: {
    "/connectionDesign": {
      post: {
        tags: ["ConnectionDesign"],
        summary: "POST /connectionDesign",
        operationId: "post_connectionDesign_connectionDesign",
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
    "/connectionDesign/all": {
      get: {
        tags: ["ConnectionDesign"],
        summary: "GET /connectionDesign/all",
        operationId: "get_connectionDesign_connectionDesign_all",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/connectionDesign/file/{designerId}/{fileId}": {
      get: {
        tags: ["ConnectionDesign"],
        summary: "GET /connectionDesign/file/{designerId}/{fileId}",
        operationId: "get_connectionDesign_connectionDesign_file_designerId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "designerId", required: true, schema: { type: "string" } },
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
    "/connectionDesign/files/{designerId}/{fileId}": {
      delete: {
        tags: ["ConnectionDesign"],
        summary: "DELETE /connectionDesign/files/{designerId}/{fileId}",
        operationId: "delete_connectionDesign_connectionDesign_files_designerId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "designerId", required: true, schema: { type: "string" } },
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
    "/connectionDesign/id/{id}": {
      delete: {
        tags: ["ConnectionDesign"],
        summary: "DELETE /connectionDesign/id/{id}",
        operationId: "delete_connectionDesign_connectionDesign_id_id",
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
    "/connectionDesign/update/{id}": {
      put: {
        tags: ["ConnectionDesign"],
        summary: "PUT /connectionDesign/update/{id}",
        operationId: "put_connectionDesign_connectionDesign_update_id",
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
    "/connectionDesign/viewFile/{designerId}/{fileId}": {
      get: {
        tags: ["ConnectionDesign"],
        summary: "GET /connectionDesign/viewFile/{designerId}/{fileId}",
        operationId: "get_connectionDesign_connectionDesign_viewFile_designerId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "designerId", required: true, schema: { type: "string" } },
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
    "/connectionDesign/{id}": {
      get: {
        tags: ["ConnectionDesign"],
        summary: "GET /connectionDesign/{id}",
        operationId: "get_connectionDesign_connectionDesign_id",
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
    "/connectionDesignerQuota": {
      post: {
        tags: ["ConnectionDesign"],
        summary: "POST /connectionDesignerQuota",
        operationId: "post_connectionDesign_connectionDesignerQuota",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(ConnectionDesignerQuotaSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/connectionDesignerQuota/all": {
      get: {
        tags: ["ConnectionDesign"],
        summary: "GET /connectionDesignerQuota/all",
        operationId: "get_connectionDesign_connectionDesignerQuota_all",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/connectionDesignerQuota/approve/{id}": {
      put: {
        tags: ["ConnectionDesign"],
        summary: "PUT /connectionDesignerQuota/approve/{id}",
        operationId: "put_connectionDesign_connectionDesignerQuota_approve_id",
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
    "/connectionDesignerQuota/delete/{id}": {
      delete: {
        tags: ["ConnectionDesign"],
        summary: "DELETE /connectionDesignerQuota/delete/{id}",
        operationId: "delete_connectionDesign_connectionDesignerQuota_delete_id",
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
    "/connectionDesignerQuota/designer/{designerId}": {
      get: {
        tags: ["ConnectionDesign"],
        summary: "GET /connectionDesignerQuota/designer/{designerId}",
        operationId: "get_connectionDesign_connectionDesignerQuota_designer_designerId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "designerId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/connectionDesignerQuota/update/{id}": {
      put: {
        tags: ["ConnectionDesign"],
        summary: "PUT /connectionDesignerQuota/update/{id}",
        operationId: "put_connectionDesign_connectionDesignerQuota_update_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(updateConnectionDesignerQuotaSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/connectionDesignerQuota/viewFile/{quotaId}/{fileId}": {
      get: {
        tags: ["ConnectionDesign"],
        summary: "GET /connectionDesignerQuota/viewFile/{quotaId}/{fileId}",
        operationId: "get_connectionDesign_connectionDesignerQuota_viewFile_quotaId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "quotaId", required: true, schema: { type: "string" } },
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
    "/connectionDesignerQuota/{id}": {
      get: {
        tags: ["ConnectionDesign"],
        summary: "GET /connectionDesignerQuota/{id}",
        operationId: "get_connectionDesign_connectionDesignerQuota_id",
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
    "/connectionDesignerQuota/{quotaId}/files/{fileId}": {
      get: {
        tags: ["ConnectionDesign"],
        summary: "GET /connectionDesignerQuota/{quotaId}/files/{fileId}",
        operationId: "get_connectionDesign_connectionDesignerQuota_quotaId_files_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "quotaId", required: true, schema: { type: "string" } },
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

export default connectionDesignOpenApiDoc;
