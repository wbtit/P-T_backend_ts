import prisma from "../../config/database/client";
import { ifaCompletionInvoiceTemplate } from "./mailtemplates/ifaCompletionInvoiceTemplate";
import { getCCEmails, sendEmail } from "./mailconfig";

export default async function sendIFACompletionAlertPMO(project:any, fabricator:any) {
    if (process.env.NODE_ENV !== 'production') {
        console.log('Email sending disabled in development environment');
        return true;
    }
    if (!process.env.PMO_EMAIL) {
        console.warn("PMO_EMAIL is not configured; skipping IFA completion alert");
        return false;
    }

    const ccEmails = await getCCEmails();
    const mailOptions={
        to:process.env.PMO_EMAIL,
        cc: ccEmails,
        subject:`Raise Invoice for the IFA Completion of Project: ${project.name}`,
        html:ifaCompletionInvoiceTemplate(project,fabricator)
    }
    try {
        await sendEmail(mailOptions);
        await prisma.project.update({
            where:{
                id:project.id
            },
            data:{
                IFACompletionAlertSent:true
            }
        })
        return true;
    } catch (error) {
        console.error(`Error sending submission reminder for project ${project.name}:`, error);
        return false
    }
}
