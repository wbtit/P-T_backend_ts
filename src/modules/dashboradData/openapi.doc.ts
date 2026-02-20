import { ModuleOpenApiDoc } from "../../openapi/types";

export const dashboradDataOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "DashboardData",
    description: "API endpoints for DashboardData module"
  },
  paths: {
    "/dashBoardData": {
      get: {
        tags: ["DashboardData"],
        summary: "GET /dashBoardData",
        operationId: "get_dashboradData_dashBoardData",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/dashBoardData/clientAdmin": {
      get: {
        tags: ["DashboardData"],
        summary: "GET /dashBoardData/clientAdmin",
        operationId: "get_dashboradData_dashBoardData_clientAdmin",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/dashBoardData/projectManager": {
      get: {
        tags: ["DashboardData"],
        summary: "GET /dashBoardData/projectManager",
        operationId: "get_dashboradData_dashBoardData_projectManager",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/dashBoardData/sales": {
      get: {
        tags: ["DashboardData"],
        summary: "GET /dashBoardData/sales",
        operationId: "get_dashboradData_dashBoardData_sales",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/dashBoardData/operationExecutive": {
      get: {
        tags: ["DashboardData"],
        summary: "GET /dashBoardData/operationExecutive",
        operationId: "get_dashboradData_dashBoardData_operationExecutive",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Access denied" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
  }
};

export default dashboradDataOpenApiDoc;
