import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";

export const agentOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Agent",
    description: "API endpoints for Agent module"
  },
  paths: {
    "/agent/query": {
      post: {
        tags: ["Agent"],
        summary: "POST /agent/query",
        operationId: "post_agent_agent_query",
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
  }
};

export default agentOpenApiDoc;
