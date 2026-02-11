import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { UpdateUserSchema, createUserSchema } from "../user/dtos";

export const clientOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Client",
    description: "API endpoints for Client module"
  },
  paths: {
    "/client": {
      get: {
        tags: ["Client"],
        summary: "GET /client",
        operationId: "get_client_client",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/client/byFabricator/{fabricatorId}": {
      get: {
        tags: ["Client"],
        summary: "GET /client/byFabricator/{fabricatorId}",
        operationId: "get_client_client_byFabricator_fabricatorId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "fabricatorId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/client/{fabricatorId}": {
      post: {
        tags: ["Client"],
        summary: "POST /client/{fabricatorId}",
        operationId: "post_client_client_fabricatorId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "fabricatorId", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(createUserSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/client/{userId}": {
      delete: {
        tags: ["Client"],
        summary: "DELETE /client/{userId}",
        operationId: "delete_client_client_userId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "userId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      get: {
        tags: ["Client"],
        summary: "GET /client/{userId}",
        operationId: "get_client_client_userId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "userId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      put: {
        tags: ["Client"],
        summary: "PUT /client/{userId}",
        operationId: "put_client_client_userId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "userId", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateUserSchema),
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

export default clientOpenApiDoc;
