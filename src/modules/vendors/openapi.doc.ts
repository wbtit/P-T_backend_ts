import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { VendorQuotaSchema, updateVendorQuotaSchema } from "./dto";

export const vendorsOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Vendors",
    description: "API endpoints for Vendors module"
  },
  paths: {
    "/vendorQuota": {
      post: {
        tags: ["Vendors"],
        summary: "POST /vendorQuota",
        operationId: "post_vendors_vendorQuota",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(VendorQuotaSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/vendorQuota/all": {
      get: {
        tags: ["Vendors"],
        summary: "GET /vendorQuota/all",
        operationId: "get_vendors_vendorQuota_all",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/vendorQuota/approve/{id}": {
      post: {
        tags: ["Vendors"],
        summary: "POST /vendorQuota/approve/{id}",
        operationId: "post_vendors_vendorQuota_approve_id",
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
    "/vendorQuota/id/{id}": {
      delete: {
        tags: ["Vendors"],
        summary: "DELETE /vendorQuota/id/{id}",
        operationId: "delete_vendors_vendorQuota_id_id",
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
    "/vendorQuota/update/{id}": {
      put: {
        tags: ["Vendors"],
        summary: "PUT /vendorQuota/update/{id}",
        operationId: "put_vendors_vendorQuota_update_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(updateVendorQuotaSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/vendorQuota/vendor/{vendorId}": {
      get: {
        tags: ["Vendors"],
        summary: "GET /vendorQuota/vendor/{vendorId}",
        operationId: "get_vendors_vendorQuota_vendor_vendorId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "vendorId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/vendorQuota/{id}": {
      get: {
        tags: ["Vendors"],
        summary: "GET /vendorQuota/{id}",
        operationId: "get_vendors_vendorQuota_id",
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
    "/vendors": {
      post: {
        tags: ["Vendors"],
        summary: "POST /vendors",
        operationId: "post_vendors_vendors",
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
    "/vendors/all": {
      get: {
        tags: ["Vendors"],
        summary: "GET /vendors/all",
        operationId: "get_vendors_vendors_all",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/vendors/certificates/{vendorId}/{certificateId}": {
      delete: {
        tags: ["Vendors"],
        summary: "DELETE /vendors/certificates/{vendorId}/{certificateId}",
        operationId: "delete_vendors_vendors_certificates_vendorId_certificateId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "vendorId", required: true, schema: { type: "string" } },
          { in: "path", name: "certificateId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/vendors/file/{vendorId}/{fileId}": {
      get: {
        tags: ["Vendors"],
        summary: "GET /vendors/file/{vendorId}/{fileId}",
        operationId: "get_vendors_vendors_file_vendorId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "vendorId", required: true, schema: { type: "string" } },
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
    "/vendors/files/{vendorId}/{fileId}": {
      delete: {
        tags: ["Vendors"],
        summary: "DELETE /vendors/files/{vendorId}/{fileId}",
        operationId: "delete_vendors_vendors_files_vendorId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "vendorId", required: true, schema: { type: "string" } },
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
    "/vendors/id/{id}": {
      delete: {
        tags: ["Vendors"],
        summary: "DELETE /vendors/id/{id}",
        operationId: "delete_vendors_vendors_id_id",
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
    "/vendors/update/{id}": {
      put: {
        tags: ["Vendors"],
        summary: "PUT /vendors/update/{id}",
        operationId: "put_vendors_vendors_update_id",
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
    "/vendors/viewFile/{vendorId}/{fileId}": {
      get: {
        tags: ["Vendors"],
        summary: "GET /vendors/viewFile/{vendorId}/{fileId}",
        operationId: "get_vendors_vendors_viewFile_vendorId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "vendorId", required: true, schema: { type: "string" } },
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
    "/vendors/{id}": {
      get: {
        tags: ["Vendors"],
        summary: "GET /vendors/{id}",
        operationId: "get_vendors_vendors_id",
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

export default vendorsOpenApiDoc;
