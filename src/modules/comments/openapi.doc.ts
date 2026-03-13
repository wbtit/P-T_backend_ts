import { ModuleOpenApiDoc } from "../../openapi/types";
import { zodRequestBody } from "../../openapi/zod";
import { createCommentSchema } from "./dtos";

export const commentsOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Comments",
    description: "API endpoints for Comments module"
  },
  paths: {
    "/comment": {
      post: {
        tags: ["Comments"],
        summary: "POST /comment",
        operationId: "post_comments_comment",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createCommentSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/comment/acknowledge/{id}": {
      patch: {
        tags: ["Comments"],
        summary: "PATCH /comment/acknowledge/{id}",
        operationId: "patch_comments_comment_acknowledge_id",
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
    "/comment/myComments": {
      get: {
        tags: ["Comments"],
        summary: "GET /comment/myComments",
        operationId: "get_comments_comment_myComments",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/comment/{id}": {
      get: {
        tags: ["Comments"],
        summary: "GET /comment/{id}",
        operationId: "get_comments_comment_id",
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
  }
};

export default commentsOpenApiDoc;
