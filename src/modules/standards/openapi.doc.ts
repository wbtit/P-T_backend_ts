import { ModuleOpenApiDoc } from "../../openapi/types";

const standards_doc: ModuleOpenApiDoc = {
  tags: [
    {
      name: "Standards",
      description: "Endpoints for managing and querying PDF standards",
    },
  ],
  paths: {
    "/standards/upload": {
      post: {
        tags: ["Standards"],
        summary: "Upload a standard document",
        description: "Uploads a PDF standard document for processing.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                  sourceType: { type: "string", enum: ["GENERAL", "FABRICATOR"] },
                  projectId: { type: "string", format: "uuid", nullable: true },
                  fabricatorId: { type: "string", format: "uuid", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Upload started successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    documentId: { type: "string", format: "uuid" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - missing file or invalid parameters",
          },
          "401": {
            description: "Unauthorized - missing or invalid authentication token",
          },
          "500": {
            description: "Internal server error",
          }
        },
      },
    },
    "/projects/{projectId}/standards/chat": {
      post: {
        tags: ["Standards"],
        summary: "Chat with project standards",
        description: "Queries the vector database for standards associated with the project and returns a synthesized answer with citations.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  query: { type: "string" },
                },
                required: ["query"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Successfully retrieved answers",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    projectId: { type: "string", format: "uuid" },
                    queryText: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    answers: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          messageId: { type: "string", format: "uuid" },
                          sourceType: { type: "string" },
                          chunkType: { type: "string" },
                          answerText: { type: "string", nullable: true },
                          citationPdfName: { type: "string" },
                          citationPageStart: { type: "integer" },
                          citationPageEnd: { type: "integer" },
                          anchorPageStart: { type: "integer", nullable: true },
                          anchorPageEnd: { type: "integer", nullable: true },
                          imagePaths: {
                            type: "array",
                            items: { type: "string" }
                          },
                          pinnedDocumentId: { type: "string", format: "uuid", nullable: true },
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            description: "Bad request - missing or invalid query",
          },
          "401": {
            description: "Unauthorized - missing or invalid authentication token",
          },
          "500": {
            description: "Internal server error",
          }
        },
      },
    },
    "/projects/{projectId}/standards/chat/history": {
      get: {
        tags: ["Standards"],
        summary: "Get chat history for a project",
        description: "Retrieves the standard chat query history and their corresponding answers for a specific project.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Successfully retrieved history",
          },
          "401": {
            description: "Unauthorized - missing or invalid authentication token",
          },
          "500": {
            description: "Internal server error",
          }
        },
      },
    },
  },
};

export default standards_doc;
