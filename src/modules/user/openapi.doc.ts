import { ModuleOpenApiDoc } from "../../openapi/types";
import { zodRequestBody } from "../../openapi/zod";
import { publicSignupSchema, signinSchema, changePasswordSchema, verifyChallengeSchema } from "./auth/dtos";
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
    "/auth/change-password": {
      patch: {
        tags: ["User"],
        summary: "PATCH /auth/change-password",
        operationId: "patch_user_auth_change_password",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(changePasswordSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/auth/verify-challenge": {
      post: {
        tags: ["User"],
        summary: "POST /auth/verify-challenge",
        description: "Verify the OTP challenge token to trust the current IP and device fingerprint.",
        operationId: "post_user_auth_verify_challenge",
        requestBody: zodRequestBody(verifyChallengeSchema),
        responses: {
          "200": { description: "Success - issues authentication JWT" },
          "400": { description: "Bad Request - invalid OTP" },
          "401": { description: "Unauthorized - challenge expired or invalid token" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/auth/analytics/admin": {
      get: {
        tags: ["User"],
        summary: "GET /auth/analytics/admin",
        description: "Retrieve risk-based authentication metrics for administrators.",
        operationId: "get_user_auth_analytics_admin",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/auth/analytics/me": {
      get: {
        tags: ["User"],
        summary: "GET /auth/analytics/me",
        description: "Retrieve login history and trusted devices for the currently logged in user.",
        operationId: "get_user_auth_analytics_me",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/auth/analytics/user/{userId}": {
      get: {
        tags: ["User"],
        summary: "GET /auth/analytics/user/{userId}",
        description: "Retrieve risk-based authentication tracking data (login history and trusted devices) for a specific user.",
        operationId: "get_user_auth_analytics_user_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "userId", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden - Admin privilege required" },
          "404": { description: "User not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/auth/analytics/ip-changes": {
      get: {
        tags: ["User"],
        summary: "GET /auth/analytics/ip-changes",
        description: "Retrieve users whose current login IP differs from their previous login IP and issue notification alerts to designated management and HR roles.",
        operationId: "get_user_auth_analytics_ip_changes",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden - Admin privilege required" },
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
