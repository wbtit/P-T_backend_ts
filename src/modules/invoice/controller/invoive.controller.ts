import { Request, Response } from "express";
import { InvoiceService } from "../services";
import { AppError } from "../../../config/utils/AppError";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import prisma from "../../../config/database/client";
import { notifyProjectStakeholdersByRole } from "../../../utils/notifyProjectStakeholders";
import { UserRole } from "@prisma/client";
import { buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";

const invoiceService = new InvoiceService();
const INVOICE_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "PROJECT_MANAGER_OFFICER",
  "CONNECTION_DESIGNER_ENGINEER",
  "CONNECTION_DESIGNER_ADMIN",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "VENDOR",
  "VENDOR_ADMIN",
];

export class InvoiceController {
  // ---------------------------------------------------------------------------
  // Create Invoice
  // ---------------------------------------------------------------------------
  async handleCreateInvoice(req: AuthenticateRequest, res: Response) {
    try {
      const data = req.body;
      const user = req.user;

      if (!user?.id) {
        throw new AppError("User ID is missing", 400);
      }

      const result = await invoiceService.createInvoice(data, user.id);
      const invoiceNumber = result.invoiceNumber?.trim();
      const creatorId = user.id;
      // Background non-blocking tasks
      (async () => {
        try {
          await notifyProjectStakeholdersByRole(result.projectId, INVOICE_NOTIFY_ROLES, (role) =>
            buildRoleScopedNotification(role, {
              type: "INVOICE_CREATED",
              basePayload: { invoiceId: result.id, timestamp: new Date() },
              templates: {
                creator: { title: "", message: "" },
                external: { title: "Invoice Received", message: invoiceNumber ? `Invoice '${invoiceNumber}' was shared with you.` : "A new invoice was shared with you." },
                oversight: { title: "Invoice Created", message: invoiceNumber ? `Invoice '${invoiceNumber}' has been created.` : "A new invoice has been created." },
                internal: { title: "Invoice Created", message: invoiceNumber ? `Invoice '${invoiceNumber}' has been created.` : "A new invoice has been created." },
              },
            }),
            { excludeUserIds: [creatorId] }
          );
        } catch (error) {
          console.error("Error in handleCreateInvoice background tasks:", error);
        }
      })();

      return res.status(201).json({
        message: "Invoice created successfully",
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error(" Create Invoice Error:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Internal Server Error",
        success: false,
        data: null,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Get All Invoices
  // ---------------------------------------------------------------------------
  async handleGetAllInvoices(req: Request, res: Response) {
    try {
      const invoices = await invoiceService.getAllInvoices();

      return res.status(200).json({
        message: "Invoices fetched successfully",
        success: true,
        data: invoices,
      });
    } catch (error: any) {
      console.error(" Get All Invoices Error:", error);
      return res.status(500).json({
        message: error.message || "Failed to fetch invoices",
        success: false,
        data: null,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Get Invoice by ID
  // ---------------------------------------------------------------------------
  async handleGetInvoiceById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const invoice = await invoiceService.getInvoiceById(id);

      return res.status(200).json({
        message: "Invoice fetched successfully",
        success: true,
        data: invoice,
      });
    } catch (error: any) {
      console.error(" Get Invoice By ID Error:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to fetch invoice",
        success: false,
        data: null,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Get Pending Invoices for Authenticated Client
  // ---------------------------------------------------------------------------
  async handleGetInvoicesByClientId(req: AuthenticateRequest, res: Response) {
    try {
      const clientId = req.user?.id;
      if (!clientId) {
        throw new AppError("User ID is missing", 400);
      }

      const invoices = await invoiceService.pendingInvoicesByClient(clientId);

      return res.status(200).json({
        message: "Pending invoices fetched successfully for client",
        success: true,
        data: invoices,
      });
    } catch (error: any) {
      console.error("Get Invoices By Client Error:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to fetch invoices by client",
        success: false,
        data: null,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Update Invoice
  // ---------------------------------------------------------------------------
  async handleUpdateInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;

      const updatedInvoice = await invoiceService.updateInvoice(id, data);
      if (data?.status) {
        const updatedInvoiceNumber = updatedInvoice.invoiceNumber?.trim();
        const updaterId = (req as AuthenticateRequest).user?.id;
        const bodyStatus = data.status;

        // Background non-blocking tasks
        (async () => {
          try {
            await notifyProjectStakeholdersByRole(updatedInvoice.projectId, INVOICE_NOTIFY_ROLES, (role) =>
              buildRoleScopedNotification(role, {
                type: "INVOICE_STATUS_UPDATED",
                basePayload: { invoiceId: updatedInvoice.id, status: bodyStatus, timestamp: new Date() },
                templates: {
                  creator: { title: "", message: "" },
                  external: { title: "Invoice Status Updated", message: updatedInvoiceNumber ? `Invoice '${updatedInvoiceNumber}' status changed to '${bodyStatus}'.` : `An invoice status changed to '${bodyStatus}'.` },
                  oversight: { title: "Invoice Status Updated", message: updatedInvoiceNumber ? `Invoice '${updatedInvoiceNumber}' status changed to '${bodyStatus}'.` : `An invoice status changed to '${bodyStatus}'.` },
                  internal: { title: "Invoice Status Updated", message: updatedInvoiceNumber ? `Invoice '${updatedInvoiceNumber}' status changed to '${bodyStatus}'.` : `An invoice status changed to '${bodyStatus}'.` },
                },
              }),
              { excludeUserIds: updaterId ? [updaterId] : [] }
            );
          } catch (error) {
            console.error("Error in handleUpdateInvoice background tasks:", error);
          }
        })();
      }

      return res.status(200).json({
        message: "Invoice updated successfully",
        success: true,
        data: updatedInvoice,
      });
    } catch (error: any) {
      console.error(" Update Invoice Error:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to update invoice",
        success: false,
        data: null,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Delete Invoice
  // ---------------------------------------------------------------------------
  async handleDeleteInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await invoiceService.deleteInvoice(id);

      return res.status(200).json({
        message: result.message,
        success: true,
      });
    } catch (error: any) {
      console.error(" Delete Invoice Error:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to delete invoice",
        success: false,
      });
    }
  }

  async handlePendingInvoicesByFabricator(req:AuthenticateRequest,res:Response){
    try {
      const id = req.user?.id;
      const fabricator =  await prisma.fabricator.findFirst({
        where:{
          pointOfContact:{some:{id:id}}
        }
      })
      const result= await invoiceService.pendingInvoicesByFabricator(fabricator?.id!);
  
      return res.status(200).json({
        message: "Pending invoices for fabricator fetched successfully",
        success: true,
        data: result,
      });
    }catch (error: any) {      console.error(" Get Pending Invoices By Fabricator Error:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to fetch pending invoices by fabricator",
        success: false,
        data: null,
      });
    }
  }
  async handlePendingInvoicesByClient(req:AuthenticateRequest,res:Response){
    try {
      const id = req.user?.id;
      const result= await invoiceService.pendingInvoicesByClient(id!);
  
      return res.status(200).json({
        message: "Pending invoices for client fetched successfully",
        success: true,
        data: result,
      });
    }catch (error: any) {      console.error(" Get Pending Invoices By Client Error:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to fetch pending invoices by client",
        success: false,
        data: null,
      });
    }
  }
}
