import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { CreateDesignDrawingsResponsesSchema, CreateDesignDrawingsSchema, UpdateDesignDrawingsSchema } from "./dtos";

export const designDrawingsOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "DesignDrawings",
    description: "API endpoints for DesignDrawings module"
  },
  paths: {
    "/design-drawings": {
      get: {
        tags: ["DesignDrawings"],
        summary: "GET /design-drawings",
        operationId: "get_designDrawings_design_drawings",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      post: {
        tags: ["DesignDrawings"],
        summary: "POST /design-drawings",
        operationId: "post_designDrawings_design_drawings",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(CreateDesignDrawingsSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/design-drawings/project/{projectId}": {
      get: {
        tags: ["DesignDrawings"],
        summary: "GET /design-drawings/project/{projectId}",
        operationId: "get_designDrawings_design_drawings_project_projectId",
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
    "/design-drawings/responses/{responseId}/files/{fileId}": {
      get: {
        tags: ["DesignDrawings"],
        summary: "GET /design-drawings/responses/{responseId}/files/{fileId}",
        operationId: "get_designDrawings_design_drawings_responses_responseId_files_fileId",
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
    "/design-drawings/viewFile/response/{responseId}/{fileId}": {
      get: {
        tags: ["DesignDrawings"],
        summary: "GET /design-drawings/viewFile/response/{responseId}/{fileId}",
        operationId: "get_designDrawings_design_drawings_viewFile_response_responseId_fileId",
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
    "/design-drawings/viewFile/{designId}/{fileId}": {
      get: {
        tags: ["DesignDrawings"],
        summary: "GET /design-drawings/viewFile/{designId}/{fileId}",
        operationId: "get_designDrawings_design_drawings_viewFile_designId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "designId", required: true, schema: { type: "string" } },
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
    "/design-drawings/{designId}/files/{fileId}": {
      get: {
        tags: ["DesignDrawings"],
        summary: "GET /design-drawings/{designId}/files/{fileId}",
        operationId: "get_designDrawings_design_drawings_designId_files_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "designId", required: true, schema: { type: "string" } },
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
    "/design-drawings/{designId}/responses": {
      get: {
        tags: ["DesignDrawings"],
        summary: "GET /design-drawings/{designId}/responses",
        operationId: "get_designDrawings_design_drawings_designId_responses",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "designId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      post: {
        tags: ["DesignDrawings"],
        summary: "POST /design-drawings/{designId}/responses",
        operationId: "post_designDrawings_design_drawings_designId_responses",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "designId", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(CreateDesignDrawingsResponsesSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/design-drawings/{id}": {
      delete: {
        tags: ["DesignDrawings"],
        summary: "DELETE /design-drawings/{id}",
        operationId: "delete_designDrawings_design_drawings_id",
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
      get: {
        tags: ["DesignDrawings"],
        summary: "GET /design-drawings/{id}",
        operationId: "get_designDrawings_design_drawings_id",
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
        tags: ["DesignDrawings"],
        summary: "PUT /design-drawings/{id}",
        operationId: "put_designDrawings_design_drawings_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateDesignDrawingsSchema),
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

export default designDrawingsOpenApiDoc;
