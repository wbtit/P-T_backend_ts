import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { CoResponseSchema, CreateCOTableSchema, CreateCoSchema, CreateTableSchema, UpdateCoSchema } from "./dtos";

export const cOOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "ChangeOrder",
    description: "API endpoints for ChangeOrder module"
  },
  paths: {
    "/changeOrder": {
      post: {
        tags: ["ChangeOrder"],
        summary: "POST /changeOrder",
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
    "/changeOrder/table/{id}": {
      put: {
        tags: ["ChangeOrder"],
        summary: "PUT /changeOrder/table/{id}",
        operationId: "put_CO_changeOrder_table_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
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
        summary: "GET /changeOrder/{coId}/files/{fileId}",
        operationId: "get_CO_changeOrder_coId_files_fileId",
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
        summary: "POST /changeOrder/{coId}/responses",
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
        summary: "GET /changeOrder/{coId}/table",
        operationId: "get_CO_changeOrder_coId_table",
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
        summary: "POST /changeOrder/{coId}/table",
        operationId: "post_CO_changeOrder_coId_table",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "coId", required: true, schema: { type: "string" } },
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
        summary: "PUT /changeOrder/{id}",
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
