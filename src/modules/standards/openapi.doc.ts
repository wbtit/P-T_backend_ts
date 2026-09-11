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
                  projectId: { type: "string", format: "uuid", nullable: true, description: "Must be omitted for FABRICATOR sourceType." },
                  fabricatorId: { type: "string", format: "uuid", nullable: true, description: "Required for FABRICATOR sourceType." },
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
    "/standards/families": {
      get: {
        tags: ["Standards"],
        summary: "Get available standard families",
        description: "Returns a list of available standard families, optionally filtered by tier (GENERAL). Only returns families that have at least one ACTIVE document for the given constraints.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "tier",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["GENERAL"] },
            description: "Filter by standard tier (GENERAL)"
          }
        ],
        responses: {
          "200": {
            description: "List of standard families",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    families: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          familyCode: { type: "string" },
                          edition: { type: "string" },
                          isDefault: { type: "boolean" },
                          createdAt: { type: "string", format: "date-time" },
                          updatedAt: { type: "string", format: "date-time" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            description: "Bad request - invalid tier or missing projectId"
          },
          "401": {
            description: "Unauthorized"
          },
          "500": {
            description: "Internal server error"
          }
        }
      }
    },
    "/standards/fabricators/{fabricatorId}/families": {
      get: {
        tags: ["Standards"],
        summary: "Get available standard families for a specific fabricator",
        description: "Returns a list of available standard families that are either GENERAL tier or FABRICATOR tier for the specified fabricator. Only returns families that have at least one ACTIVE document.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "fabricatorId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "The ID of the fabricator"
          }
        ],
        responses: {
          "200": {
            description: "List of standard families",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    families: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          familyCode: { type: "string" },
                          edition: { type: "string" },
                          isDefault: { type: "boolean" },
                          createdAt: { type: "string", format: "date-time" },
                          updatedAt: { type: "string", format: "date-time" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            description: "Bad request - missing fabricatorId"
          },
          "401": {
            description: "Unauthorized"
          },
          "500": {
            description: "Internal server error"
          }
        }
      }
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
            description: "Successfully retrieved answers (or no preferences state)",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      properties: {
                        status: { type: "string", example: "no_preferences_set" },
                        message: { type: "string" }
                      }
                    },
                    {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        projectId: { type: "string", format: "uuid" },
                        queryText: { type: "string" },
                        createdAt: { type: "string", format: "date-time" },
                        answers: {
                          type: "array",
                          description: "Returns up to 2 answer objects (GENERAL, FABRICATOR). Each answer represents a discrete source tier and contains 0-3 citations. The FABRICATOR answer will be completely omitted (not a 0-citation stub) if the project has no fabricator or the fabricator lacks active documents. A 0-citation GENERAL answer indicates the query fell below the similarity threshold against every ACTIVE GENERAL document.",
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
                              citations: {
                                type: "array",
                                description: "0 to 3 citations. If 0, check the answerText for the 'not covered' or 'no preferences' message.",
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
                  ]
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
