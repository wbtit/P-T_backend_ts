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
                  sourceType: { type: "string", enum: ["GENERAL", "FABRICATOR", "PROJECT"] },
                  projectId: { type: "string", format: "uuid", nullable: true, description: "Required for PROJECT sourceType. Must be omitted for FABRICATOR sourceType." },
                  fabricatorId: { type: "string", format: "uuid", nullable: true, description: "Required for FABRICATOR and PROJECT sourceTypes." },
                  documentFamilyId: { type: "string", nullable: false, description: "Required for all sourceTypes" },
                  familyCode: { type: "string", nullable: false, description: "Required for all sourceTypes. Immutable after family creation." },
                  edition: { type: "string", nullable: false, description: "Required for all sourceTypes. Immutable after family creation." },
                  isDefault: { type: "boolean", nullable: true, description: "Optional default flag for the standard family" }
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
    "/standards/image/{documentId}/{pageNumber}": {
      get: {
        tags: ["Standards"],
        summary: "Get a standard document image page",
        description: "Returns the generated image for a specific page of a standard document.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "documentId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "pageNumber",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Successfully retrieved image file",
            content: {
              "image/jpeg": {
                schema: {
                  type: "string",
                  format: "binary"
                }
              },
              "image/png": {
                schema: {
                  type: "string",
                  format: "binary"
                }
              }
            }
          },
          "400": {
            description: "Bad request - invalid parameters",
          },
          "401": {
            description: "Unauthorized",
          },
          "404": {
            description: "Image not found",
          },
          "500": {
            description: "Internal server error",
          }
        }
      }
    },
    "/standards/documents/{id}/progress": {
      get: {
        tags: ["Standards"],
        summary: "Get document ingestion progress",
        description: "Returns the current processing status and stages for an uploaded standard document.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Successfully retrieved progress",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    processingStage: { type: "string", nullable: true },
                    pagesProcessed: { type: "integer" },
                    totalPages: { type: "integer" },
                    failureReason: { type: "string", nullable: true }
                  }
                }
              }
            }
          },
          "401": {
            description: "Unauthorized",
          },
          "404": {
            description: "Document not found",
          },
          "500": {
            description: "Internal server error",
          }
        }
      }
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
            description: "Successfully retrieved an answer",
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
                      description: "Currently always 0 or 1 answer objects, searched across a single pooled candidate set (no manual tier selection). A 0-citation answer indicates the query fell below the similarity threshold, or no ACTIVE document is visible to this project at all.",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          messageId: { type: "string", format: "uuid" },
                          sourceType: { type: "string", description: "Descriptive metadata: which document tier (GENERAL/FABRICATOR/PROJECT) the winning citation came from. Not a selection mechanism." },
                          chunkType: { type: "string" },
                          answerText: { type: "string", nullable: true },
                          pinnedDocumentId: { type: "string", format: "uuid", nullable: true },
                          citations: {
                            type: "array",
                            description: "0 to 3 citations. If 0, check the answerText for the 'not covered' message.",
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "string", format: "uuid" },
                                pageStart: { type: "integer" },
                                pageEnd: { type: "integer" },
                                pdfName: { type: "string" },
                                textContent: { type: "string" }
                              }
                            }
                          }
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
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
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
                            sourceType: { type: "string" },
                            answerText: { type: "string", nullable: true },
                            pinnedDocumentId: { type: "string", format: "uuid", nullable: true },
                            citations: { type: "array", items: { type: "object" } }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
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
