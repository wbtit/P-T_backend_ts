import prisma from "../config/database/client";
import sendIFACompletionAlertPMO from "../services/mailServices/sendIFACompletionAlertPMO";
import sendIFCCompletionAlertPMO from "../services/mailServices/sendIFCCOmpletionAlertPMO";
import { notifyProjectStakeholders } from "../utils/notifyProjectStakeholders";
import { UserRole } from "@prisma/client";

const COMPLETION_NOTIFY_ROLES: UserRole[] = [
    "ADMIN",
    "PROJECT_MANAGER_OFFICER",
    "DEPUTY_MANAGER",
    "OPERATION_EXECUTIVE",
    "CLIENT",
    "CLIENT_ADMIN",
    "CLIENT_PROJECT_COORDINATOR",
    "VENDOR",
    "VENDOR_ADMIN",
];

export async function runPMOComplition() {
    const projects = await prisma.project.findMany({
        include:{
            mileStones:true,
            submittals:true,
            fabricator:true
        }
    });
    console.log(`Processing ${projects.length} projects for PMO completion...`, projects);
    for(const project of projects){
        if(!project.fabricatorID) continue;

        let totalIFAMileStones =0;
        let totalIFCMileStones =0;

        let totalIFASubmittals = 0;
        let totalIFCSubmittals = 0;

        for(const mileStone of project.mileStones){
            if(mileStone.stage === 'IFA'){
                totalIFAMileStones++;
            } else if(mileStone.stage === 'IFC'){
                totalIFCMileStones++;
            }
        }
        for(const submittal of project.submittals){
            if(submittal.stage === 'IFA'){
                totalIFASubmittals++;
            } else if(submittal.stage === 'IFC'){
                totalIFCSubmittals++;
            }
        }

        const IFACOmpletion = totalIFAMileStones===0?0:(totalIFASubmittals/totalIFAMileStones)*100;
        const IFCCompletion = totalIFCMileStones===0?0:(totalIFCSubmittals/totalIFCMileStones)*100;

        await prisma.project.update({
            where:{id:project.id},
            data:{
                IFAComepletionPercentage: IFACOmpletion,
                IFCompletionPercentage: IFCCompletion
            }
        });

        if(IFACOmpletion === 100 &&
            !project.IFACompletionAlertSent
        ){
        await sendIFACompletionAlertPMO(project, project.fabricator);
            await notifyProjectStakeholders(project.id, COMPLETION_NOTIFY_ROLES, {
              type: "PROJECT_IFA_COMPLETED",
              title: "IFA Stage Completed",
              message: `IFA stage completed for project '${project.name}'.`,
              projectId: project.id,
              timestamp: new Date(),
            });
            await prisma.project.update({
              where: { id: project.id },
              data: { IFACompletionAlertSent: true }
            });
        }
        if(IFCCompletion === 100 &&
            !project.IFCCompletionAlertSent
        ){
        await sendIFCCompletionAlertPMO(project, project.fabricator);
            await notifyProjectStakeholders(project.id, COMPLETION_NOTIFY_ROLES, {
              type: "PROJECT_IFC_COMPLETED",
              title: "IFC Stage Completed",
              message: `IFC stage completed for project '${project.name}'.`,
              projectId: project.id,
              timestamp: new Date(),
            });
            await prisma.project.update({
              where: { id: project.id },
              data: { IFCCompletionAlertSent: true }
            });
        }
    }
}
