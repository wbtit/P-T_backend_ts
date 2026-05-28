import { ModuleOpenApiDoc } from "../../openapi/types";
import { zodRequestBody } from "../../openapi/zod";
import { createBfaDto, updateBfaDto } from "./dtos";
import z from "zod";

export const bfaOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "BFA",
    description: "API endpoints for BFA (Bid for Approval) module"
  },
  paths: {
    "/bfa": {
      post: {
        tags: ["BFA"],
        summary: "Create a new BFA",
        description: "Creates a BFA with the initial version (v1) and optional uploaded files.",
        operationId: "createBfa",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createBfaDto),
        responses: {
          "201": { description: "BFA created successfully" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "Submittal not found" },
          "500": { description: "Internal Server Error" }
        }
      },
      get: {
        tags: ["BFA"],
        summary: "Get all BFAs",
        description: "Retrieves a list of all BFA records with their current version and version history.",
        operationId: "listBfas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      }
    },
    "/bfa/{id}": {
      get: {
        tags: ["BFA"],
        summary: "Get BFA by ID",
        description: "Retrieves a single BFA record including its current version and version history.",
        operationId: "getBfaById",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "404": { description: "BFA not found" },
          "500": { description: "Internal Server Error" }
        }
      },
      put: {
        tags: ["BFA"],
        summary: "Update BFA by ID",
        description: "Updates an existing BFA record. This deactivates the current version, creates a new BfaVersion (version number incremented), and links the BFA to it.",
        operationId: "updateBfa",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: zodRequestBody(updateBfaDto),
        responses: {
          "200": { description: "BFA updated successfully" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "BFA not found" },
          "500": { description: "Internal Server Error" }
        }
      },
      delete: {
        tags: ["BFA"],
        summary: "Delete BFA by ID",
        description: "Deletes a BFA record and cascadingly deletes all its versions.",
        operationId: "deleteBfa",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "BFA deleted successfully" },
          "401": { description: "Unauthorized" },
          "404": { description: "BFA not found" },
          "500": { description: "Internal Server Error" }
        }
      }
    },
    "/bfa/submittal/{submittalId}": {
      get: {
        tags: ["BFA"],
        summary: "Get BFA by Submittal ID",
        description: "Retrieves the BFA record associated with the specified submittal ID.",
        operationId: "getBfaBySubmittalId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "submittalId", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "404": { description: "BFA not found" },
          "500": { description: "Internal Server Error" }
        }
      }
    },
    "/bfa/viewFile/{bfaId}/{fileId}": {
      get: {
        tags: ["BFA"],
        summary: "View/Download file from the current BFA version",
        description: "Streams/downloads the specified file from the active/current BFA version.",
        operationId: "viewBfaFile",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "bfaId", required: true, schema: { type: "string", format: "uuid" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "File streamed successfully" },
          "401": { description: "Unauthorized" },
          "404": { description: "BFA, version, or file not found" },
          "500": { description: "Internal Server Error" }
        }
      }
    }
  }
};

export default bfaOpenApiDoc;
