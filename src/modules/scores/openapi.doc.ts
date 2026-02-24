import { ModuleOpenApiDoc } from "../../openapi/types";
import { zodRequestBody } from "../../openapi/zod";
import z from "zod";

const measManualBodySchema = z.object({
  managerId: z.string().uuid(),
  projectId: z.string().uuid(),
});

const managerBiasBodySchema = z.object({
  managerId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
});

const epsManualBodySchema = z.object({
  employeeId: z.string().uuid(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
});

const epsRunAllBodySchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

export const scoresOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Scores",
    description: "API endpoints for Scores module"
  },
  paths: {
    "/analytics/scores/admin/analytics/employee/eps": {
      post: {
        tags: ["Scores"],
        summary: "POST /analytics/scores/admin/analytics/employee/eps",
        operationId: "post_scores_analytics_scores_admin_analytics_employee_eps",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(epsManualBodySchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/analytics/scores/admin/analytics/employee/eps/run-all": {
      post: {
        tags: ["Scores"],
        summary: "POST /analytics/scores/admin/analytics/employee/eps/run-all",
        operationId: "post_scores_analytics_scores_admin_analytics_employee_eps_run_all",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: z.toJSONSchema(epsRunAllBodySchema, {
                io: "input",
                unrepresentable: "any",
              }),
            },
          },
        },
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/analytics/scores/admin/analytics/manager/dashboard": {
      post: {
        tags: ["Scores"],
        summary: "POST /analytics/scores/admin/analytics/manager/dashboard",
        operationId: "get_scores_analytics_scores_admin_analytics_manager_dashboard",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "query", name: "managerId", required: true, schema: { type: "string", format: "uuid" } },
          { in: "query", name: "projectId", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/analytics/scores/admin/analytics/meas/run-all": {
      post: {
        tags: ["Scores"],
        summary: "POST /analytics/scores/admin/analytics/meas/run-all",
        operationId: "post_scores_analytics_scores_admin_analytics_meas_run_all",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/analytics/scores/admin/analytics/meas/trendline": {
      post: {
        tags: ["Scores"],
        summary: "POST /analytics/scores/admin/analytics/meas/trendline",
        operationId: "get_scores_analytics_scores_admin_analytics_meas_trendline",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "query", name: "managerId", required: true, schema: { type: "string", format: "uuid" } },
          { in: "query", name: "projectId", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/analytics/scores/manager/bias": {
      post: {
        tags: ["Scores"],
        summary: "POST /analytics/scores/manager/bias",
        operationId: "post_scores_analytics_scores_manager_bias",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(managerBiasBodySchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/analytics/scores/meas/run-manually": {
      post: {
        tags: ["Scores"],
        summary: "POST /analytics/scores/meas/run-manually",
        operationId: "post_scores_analytics_scores_meas_run_manually",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(measManualBodySchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/analytics/scores/meas/run-monthly": {
      post: {
        tags: ["Scores"],
        summary: "POST /analytics/scores/meas/run-monthly",
        operationId: "post_scores_analytics_scores_meas_run_monthly",
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

export default scoresOpenApiDoc;
