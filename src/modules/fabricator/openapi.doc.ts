import { ModuleOpenApiDoc } from "../../openapi/types";
import { zodRequestBody } from "../../openapi/zod";
import { CreateFabricatorSchema, UpdateFabricatorSchema } from "./dtos";
import { branchSchema } from "./branches";

export const fabricatorOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Fabricator",
    description: "API endpoints for Fabricator module"
  },
  paths: {
    "/fabricator": {
      post: {
        tags: ["Fabricator"],
        summary: "POST /fabricator",
        operationId: "post_fabricator_fabricator",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(CreateFabricatorSchema),
        responses: {
          "201": { description: "Fabricator created successfully" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/fabricator/update/{id}": {
      put: {
        tags: ["Fabricator"],
        summary: "PUT /fabricator/update/{id}",
        operationId: "put_fabricator_update_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateFabricatorSchema),
        responses: {
          "200": { description: "Fabricator updated successfully" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/fabricator/all": {
      get: {
        tags: ["Fabricator"],
        summary: "GET /fabricator/all",
        operationId: "get_fabricator_all",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Fabricators fetched successfully" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/fabricator/createdBy": {
      get: {
        tags: ["Fabricator"],
        summary: "GET /fabricator/createdBy",
        operationId: "get_fabricator_created_by",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Fabricators fetched successfully" },
          "401": { description: "Unauthorized" },
          "404": { description: "Fabricators not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/fabricator/{id}": {
      get: {
        tags: ["Fabricator"],
        summary: "GET /fabricator/{id}",
        operationId: "get_fabricator_by_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Fabricator fetched successfully" },
          "401": { description: "Unauthorized" },
          "404": { description: "Fabricator not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/fabricator/id/{id}": {
      delete: {
        tags: ["Fabricator"],
        summary: "DELETE /fabricator/id/{id}",
        operationId: "delete_fabricator_by_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Fabricator deleted successfully" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/fabricator/file/{fabricatorId}/{fileId}": {
      get: {
        tags: ["Fabricator"],
        summary: "GET /fabricator/file/{fabricatorId}/{fileId}",
        operationId: "get_fabricator_file_by_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "fabricatorId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "File fetched successfully" },
          "401": { description: "Unauthorized" },
          "404": { description: "File not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/fabricator/viewFile/{fabricatorId}/{fileId}": {
      get: {
        tags: ["Fabricator"],
        summary: "GET /fabricator/viewFile/{fabricatorId}/{fileId}",
        operationId: "get_fabricator_view_file",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "fabricatorId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "File streamed successfully" },
          "401": { description: "Unauthorized" },
          "404": { description: "File not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/fabricator/files/{fabricatorId}/{fileId}": {
      delete: {
        tags: ["Fabricator"],
        summary: "DELETE /fabricator/files/{fabricatorId}/{fileId}",
        operationId: "delete_fabricator_file",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "fabricatorId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "204": { description: "File deleted successfully" },
          "401": { description: "Unauthorized" },
          "404": { description: "File not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/fabricator/branch": {
      post: {
        tags: ["Fabricator"],
        summary: "POST /fabricator/branch",
        operationId: "post_fabricator_branch",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(branchSchema),
        responses: {
          "201": { description: "Branch created successfully" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/fabricator/branch/{id}": {
      put: {
        tags: ["Fabricator"],
        summary: "PUT /fabricator/branch/{id}",
        operationId: "put_fabricator_branch_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(branchSchema),
        responses: {
          "200": { description: "Branch updated successfully" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      delete: {
        tags: ["Fabricator"],
        summary: "DELETE /fabricator/branch/{id}",
        operationId: "delete_fabricator_branch_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "204": { description: "Branch deleted successfully" },
          "401": { description: "Unauthorized" },
          "404": { description: "Branch not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
  }
};

export default fabricatorOpenApiDoc;
