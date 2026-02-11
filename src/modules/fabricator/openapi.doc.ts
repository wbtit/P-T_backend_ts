import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { CreateFabricatorSchema } from "./dtos";

export const fabricatorOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Fabricator",
    description: "API endpoints for Fabricator module"
  },
  paths: {
    "/fabricator": {
      post: {
        tags: ["Fabricator"],
        summary: "POST /fabricator",
        operationId: "post_fabricator_fabricator",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(CreateFabricatorSchema),
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

export default fabricatorOpenApiDoc;
