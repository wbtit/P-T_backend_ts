import {transporter}  from "./transporter";
import prisma from "../../config/database/client";
import { approvalReminderTemplate } from "./mailtemplates/approvalMailReminderTemplate";
import dotenv from "dotenv";
dotenv.config();

export default async function sendApprovalReminder(project:any){
    const mailOptions={
        from:process.env.EMAIL,
        to:project.manager.email,
        subject:`Project Approval Reminder: ${project.name}`,
        html:approvalReminderTemplate(project.name,project.approvalDate,project.manager.firstName)
    }
    console.log("The email from .env",project.manager.email)
    try {
        await transporter.sendMail(mailOptions)
        console.log(`Approval reminder sent for project: ${project.name}`);

        await prisma.project.update({
            where:{
                id:project.id
            },
            data:{
                mailReminder:true
            }
        })
        console.log(`Updated approvalReminderSent for project: ${project.name}`);
        return true
    } catch (error) {
        console.error(`Error sending approval reminder for project ${project.name}:`, error);
        return false
    }
}

