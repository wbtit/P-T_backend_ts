import prisma from "../../config/database/client";
import { ifcCompletionInvoiceTemplate } from "./mailtemplates/ifcCompletionInvoiceTemplate";
import { transporter } from "./transporter";

export default async function sendIFCCompletionAlertPMO(project:any,fabricator:any){
    const mailOptions={
        from:process.env.EMAIL,
        to:process.env.PMO_EMAIL,
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