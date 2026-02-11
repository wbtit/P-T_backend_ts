import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { createTaskDto, updateTaskDto } from "./dtos";

export const tasksOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Tasks",
    description: "API endpoints for Tasks module"
  },
  paths: {
    "/task": {
      get: {
        tags: ["Tasks"],
        summary: "GET /task",
        operationId: "get_tasks_task",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      post: {
        tags: ["Tasks"],
        summary: "POST /task",
        operationId: "post_tasks_task",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createTaskDto),
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
        tags: ["Tasks"],
        summary: "POST /task/EST/end/{id}",
        operationId: "post_tasks_task_EST_end_id",
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
        tags: ["Tasks"],
        summary: "PATCH /task/EST/pause/{id}",
        operationId: "patch_tasks_task_EST_pause_id",
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
        tags: ["Tasks"],
        summary: "POST /task/EST/resume/{id}",
        operationId: "post_tasks_task_EST_resume_id",
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
        tags: ["Tasks"],
        summary: "POST /task/EST/reworkEnd/{id}",
        operationId: "post_tasks_task_EST_reworkEnd_id",
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
        tags: ["Tasks"],
        summary: "POST /task/EST/reworkStart/{id}",
        operationId: "post_tasks_task_EST_reworkStart_id",
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
        tags: ["Tasks"],
        summary: "POST /task/EST/start/{id}",
        operationId: "post_tasks_task_EST_start_id",
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
        tags: ["Tasks"],
        summary: "GET /task/EST/{id}",
        operationId: "get_tasks_task_EST_id",
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
        tags: ["Tasks"],
        summary: "POST /task/auto-close-action/{taskId}",
        operationId: "post_tasks_task_auto_close_action_taskId",
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
        tags: ["Tasks"],
        summary: "POST /task/end/{id}",
        operationId: "post_tasks_task_end_id",
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
    "/task/getAllTasks": {
      get: {
        tags: ["Tasks"],
        summary: "GET /task/getAllTasks",
        operationId: "get_tasks_task_getAllTasks",
        security: [{ bearerAuth: [] }],
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
        tags: ["Tasks"],
        summary: "PATCH /task/pause/{id}",
        operationId: "patch_tasks_task_pause_id",
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
    "/task/project/{projectId}": {
      get: {
        tags: ["Tasks"],
        summary: "GET /task/project/{projectId}",
        operationId: "get_tasks_task_project_projectId",
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
    "/task/resume/{id}": {
      post: {
        tags: ["Tasks"],
        summary: "POST /task/resume/{id}",
        operationId: "post_tasks_task_resume_id",
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
        tags: ["Tasks"],
        summary: "POST /task/reworkEnd/{id}",
        operationId: "post_tasks_task_reworkEnd_id",
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
        tags: ["Tasks"],
        summary: "POST /task/reworkStart/{id}",
        operationId: "post_tasks_task_reworkStart_id",
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
        tags: ["Tasks"],
        summary: "POST /task/start/{id}",
        operationId: "post_tasks_task_start_id",
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
    "/task/user/non-completed-tasks": {
      get: {
        tags: ["Tasks"],
        summary: "GET /task/user/non-completed-tasks",
        operationId: "get_tasks_task_user_non_completed_tasks",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/task/user/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "GET /task/user/tasks",
        operationId: "get_tasks_task_user_tasks",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/task/{id}": {
      delete: {
        tags: ["Tasks"],
        summary: "DELETE /task/{id}",
        operationId: "delete_tasks_task_id",
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
        tags: ["Tasks"],
        summary: "GET /task/{id}",
        operationId: "get_tasks_task_id",
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
        tags: ["Tasks"],
        summary: "PUT /task/{id}",
        operationId: "put_tasks_task_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(updateTaskDto),
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

export default tasksOpenApiDoc;
