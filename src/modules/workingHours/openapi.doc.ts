import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";

export const workingHoursOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "WorkingHours",
    description: "API endpoints for WorkingHours module"
  },
  paths: {
    "/task": {
      get: {
        tags: ["WorkingHours"],
        summary: "GET /task",
        operationId: "get_workingHours_task",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/task/EST/end/{id}": {
      post: {
        tags: ["WorkingHours"],
        summary: "POST /task/EST/end/{id}",
        operationId: "post_workingHours_task_EST_end_id",
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
    "/task/EST/pause/{id}": {
      patch: {
        tags: ["WorkingHours"],
        summary: "PATCH /task/EST/pause/{id}",
        operationId: "patch_workingHours_task_EST_pause_id",
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
    "/task/EST/resume/{id}": {
      post: {
        tags: ["WorkingHours"],
        summary: "POST /task/EST/resume/{id}",
        operationId: "post_workingHours_task_EST_resume_id",
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
    "/task/EST/reworkEnd/{id}": {
      post: {
        tags: ["WorkingHours"],
        summary: "POST /task/EST/reworkEnd/{id}",
        operationId: "post_workingHours_task_EST_reworkEnd_id",
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
    "/task/EST/reworkStart/{id}": {
      post: {
        tags: ["WorkingHours"],
        summary: "POST /task/EST/reworkStart/{id}",
        operationId: "post_workingHours_task_EST_reworkStart_id",
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
    "/task/EST/start/{id}": {
      post: {
        tags: ["WorkingHours"],
        summary: "POST /task/EST/start/{id}",
        operationId: "post_workingHours_task_EST_start_id",
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
    "/task/EST/{id}": {
      get: {
        tags: ["WorkingHours"],
        summary: "GET /task/EST/{id}",
        operationId: "get_workingHours_task_EST_id",
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
    "/task/auto-close-action/{taskId}": {
      post: {
        tags: ["WorkingHours"],
        summary: "POST /task/auto-close-action/{taskId}",
        operationId: "post_workingHours_task_auto_close_action_taskId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "taskId", required: true, schema: { type: "string" } },
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
    "/task/end/{id}": {
      post: {
        tags: ["WorkingHours"],
        summary: "POST /task/end/{id}",
        operationId: "post_workingHours_task_end_id",
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
    "/task/pause/{id}": {
      patch: {
        tags: ["WorkingHours"],
        summary: "PATCH /task/pause/{id}",
        operationId: "patch_workingHours_task_pause_id",
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
    "/task/resume/{id}": {
      post: {
        tags: ["WorkingHours"],
        summary: "POST /task/resume/{id}",
        operationId: "post_workingHours_task_resume_id",
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
    "/task/reworkEnd/{id}": {
      post: {
        tags: ["WorkingHours"],
        summary: "POST /task/reworkEnd/{id}",
        operationId: "post_workingHours_task_reworkEnd_id",
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
    "/task/reworkStart/{id}": {
      post: {
        tags: ["WorkingHours"],
        summary: "POST /task/reworkStart/{id}",
        operationId: "post_workingHours_task_reworkStart_id",
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
    "/task/start/{id}": {
      post: {
        tags: ["WorkingHours"],
        summary: "POST /task/start/{id}",
        operationId: "post_workingHours_task_start_id",
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
  }
};

export default workingHoursOpenApiDoc;
