import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { createDeptZod } from "./dtos";

export const departmentOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Department",
    description: "API endpoints for Department module"
  },
  paths: {
    "/department": {
      post: {
        tags: ["Department"],
        summary: "POST /department",
        operationId: "post_department_department",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createDeptZod),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/department/delete/{id}": {
      delete: {
        tags: ["Department"],
        summary: "DELETE /department/delete/{id}",
        operationId: "delete_department_department_delete_id",
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
    "/department/update/{id}": {
      put: {
        tags: ["Department"],
        summary: "PUT /department/update/{id}",
        operationId: "put_department_department_update_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(createDeptZod),
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

export default departmentOpenApiDoc;
