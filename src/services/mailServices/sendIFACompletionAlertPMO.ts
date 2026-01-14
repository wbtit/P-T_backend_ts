import prisma from "../../config/database/client";
import { ifaCompletionInvoiceTemplate } from "./mailtemplates/ifaCompletionInvoiceTemplate";
import { transporter } from "./transporter";

export default async function sendIFACompletionAlertPMO(project:any, fabricator:any) {
    const mailOptions={
        from:process.env.EMAIL,
        to:process.env.PMO_EMAIL,
        subject:`Raise Invoice for the IFA Completion of Project: ${project.name}`,
        html:ifaCompletionInvoiceTemplate(project,fabricator)
    }
    try {
        await transporter.sendMail(mailOptions);
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