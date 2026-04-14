import { ModuleOpenApiDoc } from "../../openapi/types";
import { zodRequestBody } from "../../openapi/zod";
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
        summary: "Get all invoices",
        description: "Retrieves a list of all invoices in the system.",
        operationId: "get_invoice_invoice_AllInvoices",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Successfully retrieved invoices" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/account": {
      post: {
        tags: ["Invoice"],
        summary: "Create account info",
        description: "Creates new account information for invoicing.",
        operationId: "post_invoice_invoice_account",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createAccountInfoSchema),
        responses: {
          "201": { description: "Account info created successfully" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/account/{id}": {
      delete: {
        tags: ["Invoice"],
        summary: "Delete account info",
        description: "Deletes specific account information by its ID.",
        operationId: "delete_invoice_invoice_account_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Account info deleted successfully" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "Account info not found" },
          "500": { description: "Internal Server Error" }
        }
      },
      get: {
        tags: ["Invoice"],
        summary: "Get account info by ID",
        description: "Retrieves specific account information by its ID.",
        operationId: "get_invoice_invoice_account_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Successfully retrieved account info" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "Account info not found" },
          "500": { description: "Internal Server Error" }
        }
      },
      put: {
        tags: ["Invoice"],
        summary: "Update account info",
        description: "Updates specific account information by its ID.",
        operationId: "put_invoice_invoice_account_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(updateAccountInfoSchema),
        responses: {
          "200": { description: "Account info updated successfully" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "Account info not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/accounts/all": {
      get: {
        tags: ["Invoice"],
        summary: "Get all account info",
        description: "Retrieves a list of all account information entries.",
        operationId: "get_invoice_invoice_accounts_all",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Successfully retrieved all account info" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/byId/{id}": {
      get: {
        tags: ["Invoice"],
        summary: "Get invoice by ID",
        description: "Retrieves a specific invoice by its ID.",
        operationId: "get_invoice_invoice_byId_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Successfully retrieved invoice" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "Invoice not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/client": {
      get: {
        tags: ["Invoice"],
        summary: "Get pending invoices for authenticated client",
        description: "Retrieves a list of pending invoices for the currently authenticated client.",
        operationId: "get_invoice_invoice_client",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Successfully retrieved pending invoices for client" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/create": {
      post: {
        tags: ["Invoice"],
        summary: "Create invoice",
        description: "Creates a new invoice in the system.",
        operationId: "post_invoice_invoice_create",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(createInvoiceSchema),
        responses: {
          "201": { description: "Invoice created successfully" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/pending/client": {
      get: {
        tags: ["Invoice"],
        summary: "Get pending invoices for client",
        description: "Retrieves pending invoices for the authenticated client (same as /invoice/client).",
        operationId: "get_invoice_invoice_pending_client",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Successfully retrieved pending invoices for client" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/pending/fabricator": {
      get: {
        tags: ["Invoice"],
        summary: "Get pending invoices for fabricator",
        description: "Retrieves a list of pending invoices for the currently authenticated fabricator.",
        operationId: "get_invoice_invoice_pending_fabricator",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Successfully retrieved pending invoices for fabricator" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/invoice/{id}": {
      delete: {
        tags: ["Invoice"],
        summary: "Delete invoice",
        description: "Deletes a specific invoice by its ID.",
        operationId: "delete_invoice_invoice_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Invoice deleted successfully" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "Invoice not found" },
          "500": { description: "Internal Server Error" }
        }
      },
      put: {
        tags: ["Invoice"],
        summary: "Update invoice",
        description: "Updates a specific invoice by its ID.",
        operationId: "put_invoice_invoice_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(updateInvoiceSchema),
        responses: {
          "200": { description: "Invoice updated successfully" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "404": { description: "Invoice not found" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
  }
};

export default invoiceOpenApiDoc;
