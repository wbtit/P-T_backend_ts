import { Stage } from "@prisma/client";
import prisma from "../../../config/database/client";

export async function createProjectWbsForStage(projectId:string,stage:Stage) {
    return prisma.$transaction(async tx=>{
        const selections = await tx.projectWbsSelection.findMany({
            where:{projectId:projectId,isActive:true},
            include:{
                wbsTemplate:{include:{lineItems:true}},
            },
        });
        for(const sel of selections){
            const exsits = await tx.projectWbs.findFirst({
                where:{
                    projectId,
                    stage,
                    wbsTemplateId:sel.wbsTemplateId,
                },
            });
            if(exsits) continue;

            const wbs = await tx.projectWbs.create({
                data:{
                    projectId,
                    stage,
                    wbsTemplateId:sel.wbsTemplateId,
                    templateVersion:sel.wbsTemplate.version,
                    name:sel.wbsTemplate.name,
                    type:sel.wbsTemplate.type,
                },
            });

            await tx.projectLineItem.createMany({
                data:sel.wbsTemplate.lineItems.map(li=>({
                    projectWbsId:wbs.id,
                    lineItemTemplateId: li.id,
                    description: li.description,
                    unitTime: li.unitTime,
                    checkUnitTime: li.checkUnitTime,
                    
                })),
           });
        }
    });
}