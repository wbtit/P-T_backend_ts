import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { EstimationTaskDTO, UpdateEstimationTask } from "./estimationTask/dtos";
import { createLineItemGroupSchema, createLineItemSchema, updateLineItemGroupSchema, updateLineItemSchema } from "./lineItems/dtos";
import { EstimationSchema, UpdateEstimationDto } from "./management/dtos";

export const estimationOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Estimation",
    description: "API endpoints for Estimation module"
  },
  paths: {
    "/estimation/estimation-tasks": {
      get: {
        tags: ["Estimation"],
        summary: "GET /estimation/estimation-tasks",
        operationId: "get_estimation_estimation_estimation_tasks",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      post: {
        tags: ["Estimation"],
        summary: "POST /estimation/estimation-tasks",
        operationId: "post_estimation_estimation_estimation_tasks",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(EstimationTaskDTO),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/estimation/estimation-tasks/my": {
      get: {
        tags: ["Estimation"],
        summary: "GET /estimation/estimation-tasks/my",
        operationId: "get_estimation_estimation_estimation_tasks_my",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/estimation/estimation-tasks/my/all": {
      get: {
        tags: ["Estimation"],
        summary: "GET /estimation/estimation-tasks/my/all",
        operationId: "get_estimation_estimation_estimation_tasks_my_all",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/estimation/estimation-tasks/{id}": {
      delete: {
        tags: ["Estimation"],
        summary: "DELETE /estimation/estimation-tasks/{id}",
        operationId: "delete_estimation_estimation_estimation_tasks_id",
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
        tags: ["Estimation"],
        summary: "GET /estimation/estimation-tasks/{id}",
        operationId: "get_estimation_estimation_estimation_tasks_id",
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
      patch: {
        tags: ["Estimation"],
        summary: "PATCH /estimation/estimation-tasks/{id}",
        operationId: "patch_estimation_estimation_estimation_tasks_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateEstimationTask),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/estimation/estimation-tasks/{id}/review": {
      patch: {
        tags: ["Estimation"],
        summary: "PATCH /estimation/estimation-tasks/{id}/review",
        operationId: "patch_estimation_estimation_estimation_tasks_id_review",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateEstimationTask),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/estimation/estimations": {
      get: {
        tags: ["Estimation"],
        summary: "GET /estimation/estimations",
        operationId: "get_estimation_estimation_estimations",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      post: {
        tags: ["Estimation"],
        summary: "POST /estimation/estimations",
        operationId: "post_estimation_estimation_estimations",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(EstimationSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/estimation/estimations/user/me": {
      get: {
        tags: ["Estimation"],
        summary: "GET /estimation/estimations/user/me",
        operationId: "get_estimation_estimation_estimations_user_me",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/estimation/estimations/{estimationId}/files/{fileId}": {
      get: {
        tags: ["Estimation"],
        summary: "GET /estimation/estimations/{estimationId}/files/{fileId}",
        operationId: "get_estimation_estimation_estimations_estimationId_files_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "estimationId", required: true, schema: { type: "string" } },
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
    "/estimation/estimations/{id}": {
      delete: {
        tags: ["Estimation"],
        summary: "DELETE /estimation/estimations/{id}",
        operationId: "delete_estimation_estimation_estimations_id",
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
        tags: ["Estimation"],
        summary: "GET /estimation/estimations/{id}",
        operationId: "get_estimation_estimation_estimations_id",
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
        tags: ["Estimation"],
        summary: "PUT /estimation/estimations/{id}",
        operationId: "put_estimation_estimation_estimations_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateEstimationDto),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/estimation/estimations/{id}/price": {
      post: {
        tags: ["Estimation"],
        summary: "POST /estimation/estimations/{id}/price",
        operationId: "post_estimation_estimation_estimations_id_price",
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
    "/estimation/estimations/{id}/status/{status}": {
      patch: {
        tags: ["Estimation"],
        summary: "PATCH /estimation/estimations/{id}/status/{status}",
        operationId: "patch_estimation_estimation_estimations_id_status_status",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
          { in: "path", name: "status", required: true, schema: { type: "string" } },
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
    "/estimation/line-items": {
      post: {
        tags: ["Estimation"],
        summary: "POST /estimation/line-items",
        operationId: "post_estimation_estimation_line_items",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createLineItemGroupSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/estimation/line-items/Bygroup/{groupId}": {
      get: {
        tags: ["Estimation"],
        summary: "GET /estimation/line-items/Bygroup/{groupId}",
        operationId: "get_estimation_estimation_line_items_Bygroup_groupId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "groupId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/estimation/line-items/allGroups": {
      get: {
        tags: ["Estimation"],
        summary: "GET /estimation/line-items/allGroups",
        operationId: "get_estimation_estimation_line_items_allGroups",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/estimation/line-items/group/{id}": {
      get: {
        tags: ["Estimation"],
        summary: "GET /estimation/line-items/group/{id}",
        operationId: "get_estimation_estimation_line_items_group_id",
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
    "/estimation/line-items/groups/{id}": {
      get: {
        tags: ["Estimation"],
        summary: "GET /estimation/line-items/groups/{id}",
        operationId: "get_estimation_estimation_line_items_groups_id",
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
    "/estimation/line-items/item": {
      post: {
        tags: ["Estimation"],
        summary: "POST /estimation/line-items/item",
        operationId: "post_estimation_estimation_line_items_item",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createLineItemSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/estimation/line-items/item/{id}": {
      delete: {
        tags: ["Estimation"],
        summary: "DELETE /estimation/line-items/item/{id}",
        operationId: "delete_estimation_estimation_line_items_item_id",
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
    "/estimation/line-items/update/{id}": {
      put: {
        tags: ["Estimation"],
        summary: "PUT /estimation/line-items/update/{id}",
        operationId: "put_estimation_estimation_line_items_update_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(updateLineItemSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/estimation/line-items/{id}": {
      delete: {
        tags: ["Estimation"],
        summary: "DELETE /estimation/line-items/{id}",
        operationId: "delete_estimation_estimation_line_items_id",
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
        tags: ["Estimation"],
        summary: "PUT /estimation/line-items/{id}",
        operationId: "put_estimation_estimation_line_items_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(updateLineItemGroupSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/estimation/viewFile/{estimationId}/{fileId}": {
      get: {
        tags: ["Estimation"],
        summary: "GET /estimation/viewFile/{estimationId}/{fileId}",
        operationId: "get_estimation_estimation_viewFile_estimationId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "estimationId", required: true, schema: { type: "string" } },
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

export default estimationOpenApiDoc;
