import { ModuleOpenApiDoc } from "../../openapi/types";
import { zodRequestBody } from "../../openapi/zod";
import { CreateInvoiceWireTransferSchema, UpdateInvoiceWireTransferSchema } from "./dtos";

export const invoiceWireTransferOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "InvoiceWireTransfers",
    description: "API endpoints for Invoice Wire Transfers"
  },
  paths: {
    "/invoiceWireTransfer/create": {
      post: {
        tags: ["InvoiceWireTransfers"],
        summary: "Create a new wire transfer",
        operationId: "post_invoiceWireTransfer_create",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(CreateInvoiceWireTransferSchema),
        responses: {
          "201": { description: "Created" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/invoiceWireTransfer/all": {
      get: {
        tags: ["InvoiceWireTransfers"],
        summary: "Get all wire transfers",
        operationId: "get_invoiceWireTransfer_all",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/invoiceWireTransfer/byInvoiceId/{invoiceId}": {
      get: {
        tags: ["InvoiceWireTransfers"],
        summary: "Get wire transfers by invoice ID",
        operationId: "get_invoiceWireTransfer_byInvoiceId",
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
    "/invoiceWireTransfer/my-transfers": {
      get: {
        tags: ["InvoiceWireTransfers"],
        summary: "Get all wire transfers created by the logged-in user",
        operationId: "get_invoiceWireTransfer_myTransfers",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/invoiceWireTransfer/byId/{id}": {
      get: {
        tags: ["InvoiceWireTransfers"],
        summary: "Get wire transfer by ID",
        operationId: "get_invoiceWireTransfer_byId",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not Found" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/invoiceWireTransfer/{id}": {
      put: {
        tags: ["InvoiceWireTransfers"],
        summary: "Update wire transfer",
        operationId: "put_invoiceWireTransfer",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: zodRequestBody(UpdateInvoiceWireTransferSchema),
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
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
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
