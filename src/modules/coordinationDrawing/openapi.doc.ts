import { ModuleOpenApiDoc } from "../../openapi/types";

const coordinationDrawingRequestBody = {
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        required: ["projectId", "title", "message"],
        properties: {
          projectId: {
            type: "string",
            format: "uuid",
            description: "Project ID this coordination drawing belongs to",
          },
          title: {
            type: "string",
            minLength: 1,
            maxLength: 255,
          },
          message: {
            type: "string",
            minLength: 1,
          },
          stage: {
            type: "string",
            description: "Optional project stage enum value",
            example: "RFI",
          },
          files: {
            type: "array",
            description: "Optional uploaded files. Send as form-data field name `files`.",
            items: { type: "string", format: "binary" },
          },
        },
      },
    },
    "application/json": {
      schema: {
        type: "object",
        required: ["projectId", "title", "message"],
        properties: {
          projectId: { type: "string", format: "uuid" },
          title: { type: "string", minLength: 1, maxLength: 255 },
          message: { type: "string", minLength: 1 },
          stage: { type: "string", example: "RFI" },
        },
      },
    },
  },
};

const coordinationDrawingResponseRequestBody = {
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        required: ["drawingId", "description"],
        properties: {
          drawingId: {
            type: "string",
            format: "uuid",
            description: "Coordination drawing ID being responded to",
          },
          parentResponseId: {
            type: "string",
            format: "uuid",
            description: "Optional parent response ID for threaded replies",
          },
          description: {
            type: "string",
            minLength: 1,
          },
          status: {
            type: "string",
            enum: ["DRAFT", "SUBMITTED", "REVIEWED", "CLOSED"],
            default: "SUBMITTED",
          },
          wbtStatus: {
            type: "string",
            enum: ["DRAFT", "SUBMITTED", "REVIEWED", "CLOSED"],
            default: "SUBMITTED",
          },
          files: {
            type: "array",
            description: "Optional uploaded files. Send as form-data field name `files`.",
            items: { type: "string", format: "binary" },
          },
        },
      },
    },
    "application/json": {
      schema: {
        type: "object",
        required: ["drawingId", "description"],
        properties: {
          drawingId: { type: "string", format: "uuid" },
          parentResponseId: { type: "string", format: "uuid" },
          description: { type: "string", minLength: 1 },
          status: {
            type: "string",
            enum: ["DRAFT", "SUBMITTED", "REVIEWED", "CLOSED"],
            default: "SUBMITTED",
          },
          wbtStatus: {
            type: "string",
            enum: ["DRAFT", "SUBMITTED", "REVIEWED", "CLOSED"],
            default: "SUBMITTED",
          },
        },
      },
    },
  },
};

export const coordinationDrawingOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "CoordinationDrawing",
    description: "API endpoints for Project Coordination Drawings"
  },
  paths: {
    "/coordinationDrawing": {
      post: {
        tags: ["CoordinationDrawing"],
        summary: "Create a new coordination drawing",
        operationId: "post_coordinationDrawing",
        security: [{ bearerAuth: [] }],
        requestBody: coordinationDrawingRequestBody,
        responses: {
          "201": { description: "Created" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      get: {
        tags: ["CoordinationDrawing"],
        summary: "Get all coordination drawings",
        operationId: "get_coordinationDrawing",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/coordinationDrawing/project/{projectId}": {
      get: {
        tags: ["CoordinationDrawing"],
        summary: "Get coordination drawings by project ID",
        operationId: "get_coordinationDrawing_byProject",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "projectId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/coordinationDrawing/{id}": {
      get: {
        tags: ["CoordinationDrawing"],
        summary: "Get coordination drawing by ID",
        operationId: "get_coordinationDrawing_byId",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
      patch: {
        tags: ["CoordinationDrawing"],
        summary: "Update coordination drawing",
        operationId: "patch_coordinationDrawing",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
      delete: {
        tags: ["CoordinationDrawing"],
        summary: "Delete coordination drawing",
        operationId: "delete_coordinationDrawing",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/coordinationDrawing/response": {
      post: {
        tags: ["CoordinationDrawing"],
        summary: "Create a response to a coordination drawing",
        operationId: "post_coordinationDrawing_response",
        security: [{ bearerAuth: [] }],
        requestBody: coordinationDrawingResponseRequestBody,
        responses: {
          "201": { description: "Created" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/coordinationDrawing/response/{id}": {
      get: {
        tags: ["CoordinationDrawing"],
        summary: "Get response by ID",
        operationId: "get_coordinationDrawing_response",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
      patch: {
        tags: ["CoordinationDrawing"],
        summary: "Update response",
        operationId: "patch_coordinationDrawing_response",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
      delete: {
        tags: ["CoordinationDrawing"],
        summary: "Delete response",
        operationId: "delete_coordinationDrawing_response",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/coordinationDrawing/drawing/{drawingId}/responses": {
      get: {
        tags: ["CoordinationDrawing"],
        summary: "Get all responses for a coordination drawing",
        operationId: "get_coordinationDrawing_drawingResponses",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "drawingId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Success" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
  }
};

export default coordinationDrawingOpenApiDoc;
