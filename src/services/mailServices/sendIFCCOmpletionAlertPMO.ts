import prisma from "../../config/database/client";
import { ifcCompletionInvoiceTemplate } from "./mailtemplates/ifcCompletionInvoiceTemplate";
import { getCCEmails, sendEmail } from "./mailconfig";

export default async function sendIFCCompletionAlertPMO(project:any,fabricator:any){
    if (process.env.NODE_ENV !== 'production') {
        console.log('Email sending disabled in development environment');
        return true;
    }
    if (!process.env.PMO_EMAIL) {
        console.warn("PMO_EMAIL is not configured; skipping IFC completion alert");
        return false;
    }

    const ccEmails = await getCCEmails(project.id);
    const mailOptions={
        to:process.env.PMO_EMAIL,
        cc: ccEmails,
        subject:`Raise Invoice for the IFC Completion of Project: ${project.name}`,
        html:ifcCompletionInvoiceTemplate(project,fabricator)
    }
    try {
        await sendEmail(mailOptions);
        await prisma.project.update({
            where:{
                id:project.id
            },
            data:{
                IFCCompletionAlertSent:true
            }
        })
        return true;
    } catch (error) {
        console.error("Error sending IFC completion alert:", error);
    }
}
