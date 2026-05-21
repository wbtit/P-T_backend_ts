import { ModuleOpenApiDoc } from "../../openapi/types";

export const invoiceWireTransferOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "InvoiceWireTransfers",
    description: "API endpoints for Invoice Wire Transfers"
  },
  paths: {
    "/invoiceWireTransfer": {
      post: {
        tags: ["InvoiceWireTransfers"],
        summary: "Create a new wire transfer",
        operationId: "post_invoiceWireTransfer",
        security: [{ bearerAuth: [] }],
        responses: {
          "201": { description: "Created" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
      get: {
        tags: ["InvoiceWireTransfers"],
        summary: "Get all wire transfers",
        operationId: "get_invoiceWireTransfer",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/invoiceWireTransfer/invoice/{invoiceId}": {
      get: {
        tags: ["InvoiceWireTransfers"],
        summary: "Get wire transfers by invoice ID",
        operationId: "get_invoiceWireTransfer_byInvoice",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "invoiceId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Success" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/invoiceWireTransfer/{id}": {
      get: {
        tags: ["InvoiceWireTransfers"],
        summary: "Get wire transfer by ID",
        operationId: "get_invoiceWireTransfer_byId",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" },
        },
      },
      patch: {
        tags: ["InvoiceWireTransfers"],
        summary: "Update wire transfer",
        operationId: "patch_invoiceWireTransfer",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" },
        },
      },
      delete: {
        tags: ["InvoiceWireTransfers"],
        summary: "Delete wire transfer",
        operationId: "delete_invoiceWireTransfer",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
  },
};

export default invoiceWireTransferOpenApiDoc;
