import prisma from "../../../../config/database/client";
import { JobStudyRequestInput,
    JobStudyUpdateInput,
    getJobStudyInput
 } from "../dtos";

 export class JobStudyRepository{
    async create(data: JobStudyRequestInput){
        const jobStudy = await prisma.jobStudy.createMany({
      data: data.jobStudies.map((task) => ({
      description: task.description,
      QtyNo: task.QtyNo,
      unitTime: task.unitTime,
      execTime: task.execTime,
      projectId: task.projectId,
    })),
    });
        return jobStudy;
    }

    async update(id: string, data: JobStudyUpdateInput){
        const jobStudy = await prisma.jobStudy.update({
            where: { id },
            data
        });
        return jobStudy;
    }

    async findByProjectId(params:getJobStudyInput){
        const jobStudy = await prisma.jobStudy.findMany({
            where: {
                projectId: params.id
            }
        });
        return jobStudy;
    }
}