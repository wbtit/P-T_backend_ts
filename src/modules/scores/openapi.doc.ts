import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";

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
        requestBody: genericRequestBody,
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/analytics/scores/admin/analytics/manager/dashboard": {
      get: {
        tags: ["Scores"],
        summary: "GET /analytics/scores/admin/analytics/manager/dashboard",
        operationId: "get_scores_analytics_scores_admin_analytics_manager_dashboard",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/analytics/scores/admin/analytics/meas/trendline": {
      get: {
        tags: ["Scores"],
        summary: "GET /analytics/scores/admin/analytics/meas/trendline",
        operationId: "get_scores_analytics_scores_admin_analytics_meas_trendline",
        security: [{ bearerAuth: [] }],
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
        requestBody: genericRequestBody,
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
        requestBody: genericRequestBody,
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

export default scoresOpenApiDoc;
