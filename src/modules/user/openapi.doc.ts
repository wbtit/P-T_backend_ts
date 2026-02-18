import { ModuleOpenApiDoc } from "../../openapi/types";
import { zodRequestBody } from "../../openapi/zod";
import { publicSignupSchema, resetPasswordSchema, signinSchema } from "./auth/dtos";
import { UpdateUserSchema, createUserSchema } from "./dtos";

export const userOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "User",
    description: "API endpoints for User module"
  },
  paths: {
    "/auth/login": {
      post: {
        tags: ["User"],
        summary: "POST /auth/login",
        operationId: "post_user_auth_login",
        requestBody: zodRequestBody(signinSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/auth/register": {
      post: {
        tags: ["User"],
        summary: "POST /auth/register",
        operationId: "post_user_auth_register",
        requestBody: zodRequestBody(publicSignupSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/auth/reset-password": {
      patch: {
        tags: ["User"],
        summary: "PATCH /auth/reset-password",
        operationId: "patch_user_auth_reset_password",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(resetPasswordSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/employee": {
      get: {
        tags: ["User"],
        summary: "GET /employee",
        operationId: "get_user_employee",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      post: {
        tags: ["User"],
        summary: "POST /employee",
        operationId: "post_user_employee",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createUserSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/employee/id/{id}": {
      delete: {
        tags: ["User"],
        summary: "DELETE /employee/id/{id}",
        operationId: "delete_user_employee_id_id",
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
    "/employee/role/{role}": {
      get: {
        tags: ["User"],
        summary: "GET /employee/role/{role}",
        operationId: "get_user_employee_role_role",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "role", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/employee/update/{id}": {
      put: {
        tags: ["User"],
        summary: "PUT /employee/update/{id}",
        operationId: "put_user_employee_update_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
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
    "/employee/{id}": {
      get: {
        tags: ["User"],
        summary: "GET /employee/{id}",
        operationId: "get_user_employee_id",
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
    "/user/me": {
      get: {
        tags: ["User"],
        summary: "GET /user/me",
        operationId: "get_user_user_me",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/user/me/profile-pic": {
      patch: {
        tags: ["User"],
        summary: "PATCH /user/me/profile-pic",
        operationId: "patch_user_user_me_profile_pic",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  files: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                  },
                },
                required: ["files"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/user/getAllUsers": {
      get: {
        tags: ["User"],
        summary: "GET /user/getAllUsers",
        operationId: "get_user_user_getAllUsers",
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

export default userOpenApiDoc;
