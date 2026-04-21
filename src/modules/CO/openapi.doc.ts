import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { CoResponseSchema, CreateCOTableSchema, CreateCoSchema, CreateTableSchema, UpdateCoSchema, CreateChangeOrderVersionSchema } from "./dtos";

export const cOOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "ChangeOrder",
    description: "API endpoints for ChangeOrder module"
  },
  paths: {
    "/changeOrder": {
      post: {
        tags: ["ChangeOrder"],
        summary: "POST /changeOrder - Create Change Order (Initial version v1 created automatically)",
        operationId: "post_CO_changeOrder",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(CreateCoSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/changeOrder/{coId}/versions/{versionId}/{fileId}": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/{coId}/versions/{versionId}/{fileId} - View file from specific version",
        operationId: "get_CO_changeOrder_version_file",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "coId", required: true, schema: { type: "string" } },
          { in: "path", name: "versionId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "404": { description: "File/Version not found" }
        }
      }
    },
    "/changeOrder/ById/{id}": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/ById/{id}",
        operationId: "get_CO_changeOrder_ById_id",
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
    "/changeOrder/pendingCOs": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/pendingCOs",
        operationId: "get_CO_changeOrder_pendingCOs",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/changeOrder/pending/clientAdmin": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/pending/clientAdmin",
        operationId: "get_CO_changeOrder_pending_clientAdmin",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/changeOrder/pending/client": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/pending/client",
        operationId: "get_CO_changeOrder_pending_client",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/changeOrder/pending/projectManager": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/pending/projectManager",
        operationId: "get_CO_changeOrder_pending_projectManager",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/changeOrder/pending/CDAdmin": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/pending/CDAdmin",
        operationId: "get_CO_changeOrder_pending_CDAdmin",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/changeOrder/new/projectManager": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/new/projectManager",
        operationId: "get_CO_changeOrder_new_projectManager",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/changeOrder/project/{projectId}": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/project/{projectId}",
        operationId: "get_CO_changeOrder_project_projectId",
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
    "/changeOrder/received": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/received",
        operationId: "get_CO_changeOrder_received",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/changeOrder/received/{projectId}": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/received/{projectId}",
        operationId: "get_CO_changeOrder_received_projectId",
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
    "/changeOrder/responses/{id}": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/responses/{id}",
        operationId: "get_CO_changeOrder_responses_id",
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
    "/changeOrder/responses/{responseId}/files/{fileId}": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/responses/{responseId}/files/{fileId}",
        operationId: "get_CO_changeOrder_responses_responseId_files_fileId",
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
    "/changeOrder/sent": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/sent",
        operationId: "get_CO_changeOrder_sent",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/changeOrder/sent/{projectId}": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/sent/{projectId}",
        operationId: "get_CO_changeOrder_sent_projectId",
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
    "/changeOrder/table/{id}": {
      put: {
        tags: ["ChangeOrder"],
        summary: "PUT /changeOrder/table/{id} - Update/Replace table rows. Use query param 'changeOrderVersionId' to target specific version.",
        operationId: "put_CO_changeOrder_table_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
          { in: "query", name: "changeOrderVersionId", required: false, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(CreateTableSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/changeOrder/viewFile/{coId}/{fileId}": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/viewFile/{coId}/{fileId}",
        operationId: "get_CO_changeOrder_viewFile_coId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "coId", required: true, schema: { type: "string" } },
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
    "/changeOrder/viewFile/{responseId}/files/{fileId}": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/viewFile/{responseId}/files/{fileId}",
        operationId: "get_CO_changeOrder_viewFile_responseId_files_fileId",
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
    "/changeOrder/{coId}/files/{fileId}": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/{coId}/files/{fileId} - Get file metadata. Supports 'versionId' query param.",
        operationId: "get_CO_changeOrder_coId_files_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "coId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
          { in: "query", name: "versionId", required: false, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/changeOrder/{coId}/responses": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/{coId}/responses",
        operationId: "get_CO_changeOrder_coId_responses",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "coId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      post: {
        tags: ["ChangeOrder"],
        summary: "POST /changeOrder/{coId}/responses - Create response. Must target the latest active version.",
        operationId: "post_CO_changeOrder_coId_responses",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "coId", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(CoResponseSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/changeOrder/{coId}/table": {
      get: {
        tags: ["ChangeOrder"],
        summary: "GET /changeOrder/{coId}/table - List table rows. Supports 'changeOrderVersionId' query param.",
        operationId: "get_CO_changeOrder_coId_table",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "coId", required: true, schema: { type: "string" } },
          { in: "query", name: "changeOrderVersionId", required: false, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      post: {
        tags: ["ChangeOrder"],
        summary: "POST /changeOrder/{coId}/table - Create table rows. Supports 'changeOrderVersionId' query param.",
        operationId: "post_CO_changeOrder_coId_table",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "coId", required: true, schema: { type: "string" } },
          { in: "query", name: "changeOrderVersionId", required: false, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(CreateCOTableSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/changeOrder/{id}": {
      put: {
        tags: ["ChangeOrder"],
        summary: "PUT /changeOrder/{id} - Update Change Order (Automatically creates a new version/revision)",
        operationId: "put_CO_changeOrder_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateCoSchema),
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

export default cOOpenApiDoc;
