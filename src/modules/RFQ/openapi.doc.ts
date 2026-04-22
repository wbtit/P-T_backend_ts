import { ModuleOpenApiDoc } from "../../openapi/types";
import { zodRequestBody } from "../../openapi/zod";
import { CreateRfqSchema, UpdateRfqSchema } from "./dtos";
import { RfqResponseSchema } from "./RFQresponse";
import { CreateRFQFollowUpSchema, UpdateRFQFollowUpSchema } from "./followUps";
import z from "zod";

const rfqMultipartRequestBody = (schema: typeof CreateRfqSchema | typeof UpdateRfqSchema) => ({
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        properties: {
          projectNumber: { type: "string" },
          projectName: { type: "string" },
          location: { type: "string" },
          bidPrice: { type: "string" },
          fabricatorId: { type: "string" },
          senderId: { type: "string" },
          MTOManual: { oneOf: [{ type: "boolean" }, { type: "string" }] },
          MTOStickModel: { type: "string" },
          recipientId: { type: "string" },
          multipleRecipients: { type: "array", items: { type: "string" } },
          ConnectionDesignerIds: { type: "array", items: { type: "string" } },
          connectionEngineerIds: { type: "array", items: { type: "string" } },
          salesPersonId: { type: "string" },
          subject: { type: "string" },
          description: { type: "string" },
          CDDescription: { type: "string" },
          RFQDueDate: { type: "string", format: "date-time" },
          status: { type: "string" },
          tools: { type: "string" },
          wbtStatus: { type: "string" },
          estimationDate: { type: "string", format: "date-time" },
          connectionDesign: { oneOf: [{ type: "boolean" }, { type: "string" }] },
          customerDesign: { oneOf: [{ type: "boolean" }, { type: "string" }] },
          miscDesign: { oneOf: [{ type: "boolean" }, { type: "string" }] },
          detailingMain: { oneOf: [{ type: "boolean" }, { type: "string" }] },
          detailingMisc: { oneOf: [{ type: "boolean" }, { type: "string" }] },
          createdById: { type: "string" },
          link: { type: "string", nullable: true },
          files: {
            type: "array",
            items: { type: "string", format: "binary" },
          },
          CDAttachments: {
            type: "array",
            items: { type: "string", format: "binary" },
          },
        },
      },
    },
    "application/json": {
      schema: z.toJSONSchema(schema, {
        io: "input",
        unrepresentable: "any",
      }),
    },
  },
});

export const rFQOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "RFQ",
    description: "API endpoints for RFQ module"
  },
  paths: {
    "/rfq": {
      post: {
        tags: ["RFQ"],
        summary: "POST /rfq - Create RFQ (Supports multipleRecipients)",
        operationId: "post_RFQ_rfq",
        security: [{ bearerAuth: [] }],
        requestBody: rfqMultipartRequestBody(CreateRfqSchema),
        responses: {
          "201": { description: "Created" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/all": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/all",
        operationId: "get_RFQ_rfq_all",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/connectionEngineers": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/connectionEngineers",
        operationId: "get_RFQ_rfq_connectionEngineers",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/delete/{id}": {
      delete: {
        tags: ["RFQ"],
        summary: "DELETE /rfq/delete/{id}",
        operationId: "delete_RFQ_rfq_delete_id",
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
    "/rfq/getById/{id}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/getById/{id}",
        operationId: "get_RFQ_rfq_getById_id",
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
    "/rfq/pendingRFQs": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/pendingRFQs",
        operationId: "get_RFQ_rfq_pendingRFQs",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/pending/clientSide": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/pending/clientSide",
        operationId: "get_RFQ_rfq_pending_clientSide",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/pending/client": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/pending/client",
        operationId: "get_RFQ_rfq_pending_client",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/pending/projectManager": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/pending/projectManager",
        operationId: "get_RFQ_rfq_pending_projectManager",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/pending/departmentManager": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/pending/departmentManager",
        operationId: "get_RFQ_rfq_pending_departmentManager",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/pending/operationExecutive": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/pending/operationExecutive",
        operationId: "get_RFQ_rfq_pending_operationExecutive",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/pending/CDAdmin": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/pending/CDAdmin",
        operationId: "get_RFQ_rfq_pending_CDAdmin",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/new/projectManager": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/new/projectManager",
        operationId: "get_RFQ_rfq_new_projectManager",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/received": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/received",
        operationId: "get_RFQ_rfq_received",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/received/{projectId}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/received/{projectId}",
        operationId: "get_RFQ_rfq_received_projectId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/project/{projectId}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/project/{projectId}",
        operationId: "get_RFQ_rfq_project_projectId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/response/viewFile/{rfqResId}/{fileId}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/response/viewFile/{rfqResId}/{fileId}",
        operationId: "get_RFQ_rfq_response_viewFile_rfqResId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfqResId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/{rfqId}/followups": {
      post: {
        tags: ["RFQ"],
        summary: "POST /rfq/{rfqId}/followups",
        operationId: "post_RFQ_rfq_rfqId_followups",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfqId", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(CreateRFQFollowUpSchema),
        responses: {
          "201": { description: "Created" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "RFQ not found" },
          "500": { description: "Internal Server Error" }
        }
      },
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/{rfqId}/followups",
        operationId: "get_RFQ_rfq_rfqId_followups",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfqId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "RFQ not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/followups/{id}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/followups/{id}",
        operationId: "get_RFQ_rfq_followups_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "RFQ follow-up not found" },
          "500": { description: "Internal Server Error" }
        }
      },
      put: {
        tags: ["RFQ"],
        summary: "PUT /rfq/followups/{id}",
        operationId: "put_RFQ_rfq_followups_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateRFQFollowUpSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "RFQ follow-up not found" },
          "500": { description: "Internal Server Error" }
        }
      },
      delete: {
        tags: ["RFQ"],
        summary: "DELETE /rfq/followups/{id}",
        operationId: "delete_RFQ_rfq_followups_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "RFQ follow-up not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/followups/{id}/files/{fileId}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/followups/{id}/files/{fileId}",
        operationId: "get_RFQ_rfq_followups_id_files_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "File not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/followups/viewFile/{id}/{fileId}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/followups/viewFile/{id}/{fileId}",
        operationId: "get_RFQ_rfq_followups_viewFile_id_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "File not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/responses/{id}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/responses/{id}",
        operationId: "get_RFQ_rfq_responses_id",
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
    "/rfq/responses/{rfqResId}/files/{fileId}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/responses/{rfqResId}/files/{fileId}",
        operationId: "get_RFQ_rfq_responses_rfqResId_files_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfqResId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/sents": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/sents",
        operationId: "get_RFQ_rfq_sents",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/sents/{projectId}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/sents/{projectId}",
        operationId: "get_RFQ_rfq_sents_projectId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/update/{id}": {
      put: {
        tags: ["RFQ"],
        summary: "PUT /rfq/update/{id} - Update RFQ (Supports multipleRecipients)",
        operationId: "put_RFQ_rfq_update_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: rfqMultipartRequestBody(UpdateRfqSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/viewFile/{rfqId}/{fileId}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/viewFile/{rfqId}/{fileId}",
        operationId: "get_RFQ_rfq_viewFile_rfqId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfqId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/{id}": {
      delete: {
        tags: ["RFQ"],
        summary: "DELETE /rfq/{id}",
        operationId: "delete_RFQ_rfq_id",
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
    "/rfq/{rfqId}/files/{fileId}": {
      get: {
        tags: ["RFQ"],
        summary: "GET /rfq/{rfqId}/files/{fileId}",
        operationId: "get_RFQ_rfq_rfqId_files_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfqId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/rfq/{rfqId}/responses": {
      post: {
        tags: ["RFQ"],
        summary: "POST /rfq/{rfqId}/responses",
        operationId: "post_RFQ_rfq_rfqId_responses",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "rfqId", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(RfqResponseSchema),
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

export default rFQOpenApiDoc;
