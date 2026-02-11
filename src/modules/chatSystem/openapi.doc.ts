import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";

export const chatSystemOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "ChatSystem",
    description: "API endpoints for ChatSystem module"
  },
  paths: {
    "/chat/group": {
      post: {
        tags: ["ChatSystem"],
        summary: "POST /chat/group",
        operationId: "post_chatSystem_chat_group",
        security: [{ bearerAuth: [] }],
        requestBody: genericRequestBody,
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/chat/group/members": {
      post: {
        tags: ["ChatSystem"],
        summary: "POST /chat/group/members",
        operationId: "post_chatSystem_chat_group_members",
        security: [{ bearerAuth: [] }],
        requestBody: genericRequestBody,
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/chat/group/{groupId}": {
      delete: {
        tags: ["ChatSystem"],
        summary: "DELETE /chat/group/{groupId}",
        operationId: "delete_chatSystem_chat_group_groupId",
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
    "/chat/group/{groupId}/history/{lastMessageId}": {
      get: {
        tags: ["ChatSystem"],
        summary: "GET /chat/group/{groupId}/history/{lastMessageId}",
        operationId: "get_chatSystem_chat_group_groupId_history_lastMessageId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "groupId", required: true, schema: { type: "string" } },
          { in: "path", name: "lastMessageId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/chat/group/{groupId}/member/{memberId}": {
      delete: {
        tags: ["ChatSystem"],
        summary: "DELETE /chat/group/{groupId}/member/{memberId}",
        operationId: "delete_chatSystem_chat_group_groupId_member_memberId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "groupId", required: true, schema: { type: "string" } },
          { in: "path", name: "memberId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/chat/group/{groupId}/members": {
      get: {
        tags: ["ChatSystem"],
        summary: "GET /chat/group/{groupId}/members",
        operationId: "get_chatSystem_chat_group_groupId_members",
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
    "/chat/private/{userId}": {
      get: {
        tags: ["ChatSystem"],
        summary: "GET /chat/private/{userId}",
        operationId: "get_chatSystem_chat_private_userId",
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
    },
    "/chat/recent": {
      get: {
        tags: ["ChatSystem"],
        summary: "GET /chat/recent",
        operationId: "get_chatSystem_chat_recent",
        security: [{ bearerAuth: [] }],
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

export default chatSystemOpenApiDoc;
