import prisma from "../../../config/database/client";

export async  function setProjectWbsSelection(projectId:string,wbsTemplateIds:string[],userId:string){
    return prisma.$transaction(async tx =>{
      await tx.projectWbsSelection.updateMany({
        where:{projectId,isActive:true},
        data:{isActive:false}
      });
      await tx.projectWbsSelection.createMany({
        data:wbsTemplateIds.map(id=>({
          projectId,
          wbsTemplateId:id,
          selectedById:userId,
        })),
      });
    });
   }