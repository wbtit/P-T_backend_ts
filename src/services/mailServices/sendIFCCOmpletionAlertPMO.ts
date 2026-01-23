import prisma from "../../config/database/client";
import { ifcCompletionInvoiceTemplate } from "./mailtemplates/ifcCompletionInvoiceTemplate";
import { transporter } from "./transporter";
import { getCCEmails } from "./mailconfig";

export default async function sendIFCCompletionAlertPMO(project:any,fabricator:any){
    const ccEmails = await getCCEmails();
    const mailOptions={
        from:process.env.EMAIL,
        to:process.env.PMO_EMAIL,
        cc: ccEmails,
        subject:`Raise Invoice for the IFC Completion of Project: ${project.name}`,
        html:ifcCompletionInvoiceTemplate(project,fabricator)
    }
    try {
        await transporter.sendMail(mailOptions);
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
