import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { CreateTeamSchema } from "./dtos";

export const teamOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Team",
    description: "API endpoints for Team module"
  },
  paths: {
    "/team": {
      get: {
        tags: ["Team"],
        summary: "GET /team",
        operationId: "get_team_team",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      post: {
        tags: ["Team"],
        summary: "POST /team",
        operationId: "post_team_team",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(CreateTeamSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/team/addMembers/{role}": {
      post: {
        tags: ["Team"],
        summary: "POST /team/addMembers/{role}",
        operationId: "post_team_team_addMembers_role",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "role", required: true, schema: { type: "string" } },
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
    "/team/removeMembers": {
      delete: {
        tags: ["Team"],
        summary: "DELETE /team/removeMembers",
        operationId: "delete_team_team_removeMembers",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/team/updateRole/{id}": {
      put: {
        tags: ["Team"],
        summary: "PUT /team/updateRole/{id}",
        operationId: "put_team_team_updateRole_id",
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
    "/team/{id}": {
      delete: {
        tags: ["Team"],
        summary: "DELETE /team/{id}",
        operationId: "delete_team_team_id",
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
        tags: ["Team"],
        summary: "GET /team/{id}",
        operationId: "get_team_team_id",
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
        tags: ["Team"],
        summary: "PUT /team/{id}",
        operationId: "put_team_team_id",
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

export default teamOpenApiDoc;
