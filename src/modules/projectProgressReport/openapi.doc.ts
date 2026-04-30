import { ModuleOpenApiDoc } from "../../openapi/types";

const projectProgressReportRequestBody = {
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
            description: "Project ID this progress report belongs to",
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

const projectProgressReportResponseRequestBody = {
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        required: ["reportId", "description"],
        properties: {
          reportId: {
            type: "string",
            format: "uuid",
            description: "Progress report ID being responded to",
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
        required: ["reportId", "description"],
        properties: {
          reportId: { type: "string", format: "uuid" },
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

export const projectProgressReportOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "ProjectProgressReport",
    description: "API endpoints for Project Progress Reports"
  },
  paths: {
    "/projectProgressReport": {
      post: {
        tags: ["ProjectProgressReport"],
        summary: "Create a new progress report",
        operationId: "post_projectProgressReport",
        security: [{ bearerAuth: [] }],
        requestBody: projectProgressReportRequestBody,
        responses: {
          "201": { description: "Created" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      get: {
        tags: ["ProjectProgressReport"],
        summary: "Get all progress reports",
        operationId: "get_projectProgressReport",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/projectProgressReport/project/{projectId}": {
      get: {
        tags: ["ProjectProgressReport"],
        summary: "Get progress reports by project ID",
        operationId: "get_projectProgressReport_byProject",
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
    "/projectProgressReport/{id}": {
      get: {
        tags: ["ProjectProgressReport"],
        summary: "Get progress report by ID",
        operationId: "get_projectProgressReport_byId",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
      patch: {
        tags: ["ProjectProgressReport"],
        summary: "Update progress report",
        operationId: "patch_projectProgressReport",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
      delete: {
        tags: ["ProjectProgressReport"],
        summary: "Delete progress report",
        operationId: "delete_projectProgressReport",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/projectProgressReport/response": {
      post: {
        tags: ["ProjectProgressReport"],
        summary: "Create a response to a progress report",
        operationId: "post_projectProgressReport_response",
        security: [{ bearerAuth: [] }],
        requestBody: projectProgressReportResponseRequestBody,
        responses: {
          "201": { description: "Created" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/projectProgressReport/response/{id}": {
      get: {
        tags: ["ProjectProgressReport"],
        summary: "Get response by ID",
        operationId: "get_projectProgressReport_response",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
      patch: {
        tags: ["ProjectProgressReport"],
        summary: "Update response",
        operationId: "patch_projectProgressReport_response",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
      delete: {
        tags: ["ProjectProgressReport"],
        summary: "Delete response",
        operationId: "delete_projectProgressReport_response",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/projectProgressReport/report/{reportId}/responses": {
      get: {
        tags: ["ProjectProgressReport"],
        summary: "Get all responses for a progress report",
        operationId: "get_projectProgressReport_reportResponses",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "reportId",
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

export default projectProgressReportOpenApiDoc;
