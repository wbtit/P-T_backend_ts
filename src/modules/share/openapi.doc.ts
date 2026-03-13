import { ModuleOpenApiDoc } from "../../openapi/types";

export const shareOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Share",
    description: "API endpoints for sharing files"
  },
  paths: {
    "/share/{table}/{parentId}/{fileId}": {
      post: {
        tags: ["Share"],
        summary: "POST /share/{table}/{parentId}/{fileId}",
        operationId: "post_share_link",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "table", required: true, schema: { type: "string" } },
          { in: "path", name: "parentId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "201": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/share/{token}": {
      get: {
        tags: ["Share"],
        summary: "GET /share/{token}",
        operationId: "get_share_download",
        parameters: [
          { in: "path", name: "token", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
  }
};

export default shareOpenApiDoc;
