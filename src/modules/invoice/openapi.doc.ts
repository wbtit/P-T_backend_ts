import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { createAccountInfoSchema, createInvoiceSchema, updateAccountInfoSchema, updateInvoiceSchema } from "./dtos";

export const invoiceOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Invoice",
    description: "API endpoints for Invoice module"
  },
  paths: {
    "/invoice/AllInvoices": {
      get: {
        tags: ["Invoice"],
        summary: "GET /invoice/AllInvoices",
        operationId: "get_invoice_invoice_AllInvoices",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/account": {
      post: {
        tags: ["Invoice"],
        summary: "POST /invoice/account",
        operationId: "post_invoice_invoice_account",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createAccountInfoSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/account/{id}": {
      delete: {
        tags: ["Invoice"],
        summary: "DELETE /invoice/account/{id}",
        operationId: "delete_invoice_invoice_account_id",
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
      get: {
        tags: ["Invoice"],
        summary: "GET /invoice/account/{id}",
        operationId: "get_invoice_invoice_account_id",
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
      put: {
        tags: ["Invoice"],
        summary: "PUT /invoice/account/{id}",
        operationId: "put_invoice_invoice_account_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(updateAccountInfoSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/accounts/all": {
      get: {
        tags: ["Invoice"],
        summary: "GET /invoice/accounts/all",
        operationId: "get_invoice_invoice_accounts_all",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/byId/{id}": {
      get: {
        tags: ["Invoice"],
        summary: "GET /invoice/byId/{id}",
        operationId: "get_invoice_invoice_byId_id",
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
    "/invoice/client/{clientId}": {
      get: {
        tags: ["Invoice"],
        summary: "GET /invoice/client/{clientId}",
        operationId: "get_invoice_invoice_client_clientId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "clientId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/create": {
      post: {
        tags: ["Invoice"],
        summary: "POST /invoice/create",
        operationId: "post_invoice_invoice_create",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createInvoiceSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/pending/fabricator": {
      get: {
        tags: ["Invoice"],
        summary: "GET /invoice/pending/fabricator",
        operationId: "get_invoice_invoice_pending_fabricator",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/{id}": {
      delete: {
        tags: ["Invoice"],
        summary: "DELETE /invoice/{id}",
        operationId: "delete_invoice_invoice_id",
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
      put: {
        tags: ["Invoice"],
        summary: "PUT /invoice/{id}",
        operationId: "put_invoice_invoice_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(updateInvoiceSchema),
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

export default invoiceOpenApiDoc;
