import prisma from "../config/database/client";
import fs from "fs";
import { getEmailsByRoles, sendEmail } from "../services/mailServices/mailconfig";
import logger from "../utils/logger";
import { resolveUploadFilePath } from "../utils/fileUtil";
import { UserRole } from "@prisma/client";

export async function processCDFileRetention() {
  logger.info("Starting CD File Retention job");
  const targetRoles: UserRole[] = ["ADMIN", "OPERATION_EXECUTIVE", "DEPUTY_MANAGER"];
  let emails: string[] = [];



  // Process ConnectionDesignerQuota
  const quotas = await prisma.connectionDesignerQuota.findMany({ include: { connectionDesigner: true }});
  for (const quota of quotas) {
    let updatedFiles = false;
    let newFiles: any[] = [];
    let pendingDeletionFiles: any[] = [];

    const processFilesArray = (filesArray: any[], newArray: any[]) => {
      if (!Array.isArray(filesArray)) return;
      for (const file of filesArray) {
        const fullPath = resolveUploadFilePath(file);
        if (fullPath && fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
          
          if (ageInDays >= 7) {
            try {
              fs.unlinkSync(fullPath);
              updatedFiles = true;
            } catch(e) {
              logger.error(`Failed to delete file ${fullPath}: ${e}`);
              newArray.push(file);
            }
          } else {
            newArray.push(file);
            if (ageInDays >= 6 && ageInDays < 7) {
              pendingDeletionFiles.push(file);
            }
          }
        } else if (!fullPath) {
             updatedFiles = true;
        } else {
             updatedFiles = true;
        }
      }
    };

    processFilesArray(quota.files as any[] || [], newFiles);

    if (updatedFiles) {
      await prisma.connectionDesignerQuota.update({
        where: { id: quota.id },
        data: { files: newFiles }
      });
    }

    if (pendingDeletionFiles.length > 0) {
      if (emails.length === 0) emails = await getEmailsByRoles(targetRoles);
      if (emails.length > 0) {
        const fileNames = pendingDeletionFiles.map(f => f.originalName || f.filename).join(", ");
        const designerName = quota.connectionDesigner?.name || "Unknown";
        await sendEmail({
          to: emails,
          subject: "Notice: Connection Designer Quota Files Deletion Warning",
          html: `<p>The following files for Connection Designer Quota (Designer: <b>${designerName}</b>, Serial: ${quota.serialNo || 'N/A'}) are scheduled to be deleted in 1 day:</p><p>${fileNames}</p>`
        });
      }
    }
  }

  logger.info("CD File Retention job completed");
}
