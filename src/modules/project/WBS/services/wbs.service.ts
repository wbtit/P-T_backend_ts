import { WbsRepository } from "../repositories";
import { WBSInput,UpdateWBSInput, UpdateWBSSchema } from "../dtos";
import { Stage,Activity } from "@prisma/client";
import { PLIRepository } from "../../projectLineItems";
import { ProjectRepository } from "../../repositories";
import { AppError } from "../../../../config/utils/AppError";


const wbsRepository = new WbsRepository();
const pliRepository = new PLIRepository();
const projectRepository = new ProjectRepository();

export class WbsService {
    async createWbs(data: WBSInput) {
        return await wbsRepository.create(data);
    }

    async getAllWbs() {
        return await wbsRepository.getAll();
    }

    async getWbsForProject(projectId: string, stage: Stage, type: Activity) {
        return await wbsRepository.getWbsForProject(projectId, stage, type);
    }

    async getTotalWbsHours(projectId: string, stage: Stage) {
        return await wbsRepository.getTotalWbsHours(projectId, stage);
    }

    async getWbsTotal(projectId: string, stage: Stage, type: Activity) {
        return await wbsRepository.getWbsTotal(projectId, stage, type);
    }

    async getWbsStats(projectId: string, stage: Stage, type: Activity) {
    // Fetch once at the beginning
    const project = await projectRepository.get({ id: projectId });
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
  
    const estimatedMins = (project.estimatedHours || 0) * 60;
  
    const wbsActivities = await wbsRepository.getWbsForProject(projectId, stage, type);
  
    // Pre-fetch total WBS hours once (not per activity)
    const getHours = await wbsRepository.getTotalWbsHours(projectId, stage);
    const totalSubTaskHours = (getHours._sum.totalExecHr || 0) + (getHours._sum.totalCheckHr || 0);
  
    const reworkPercentage = estimatedMins
      ? ((estimatedMins - totalSubTaskHours) / estimatedMins) * 100
      : 0;
  
    // Better: make divisor dynamic, not hardcoded
    const divisor = wbsActivities.length || 1;
    const reworkPercentPerLineItems = reworkPercentage / divisor;
  
    const results = await Promise.all(
      wbsActivities.map(async (activity) => {
        const sumData = await pliRepository.getSumData(projectId, activity.id, stage);
        
        const execHr = sumData._sum.execHr || 0;
        const checkHr = sumData._sum.checkHr || 0;
        
        const totalExecHrWithRework = execHr * reworkPercentPerLineItems;
        const totalCheckHrWithRework = checkHr * reworkPercentPerLineItems;
        
        const data: UpdateWBSInput = {
          totalQtyNo: sumData._sum.QtyNo || 0,
          totalExecHr: execHr,
          totalCheckHr: checkHr,
          totalExecHrWithRework,
          totalCheckHrWithRework,
        };
      
        await wbsRepository.Update(activity.id, data, projectId, stage);
      
        return {
          id: activity.id,
          name: activity.name,
          totalQtyNo: data.totalQtyNo,
          totalExecHr: data.totalExecHr,
          totalCheckHr: data.totalCheckHr,
          subTasks: activity.LineItems || [],
          reworkPercentage,
          reworkPercentPerLineItems,
          totalExecHrWithRework,
          totalCheckHrWithRework,
        };
      })
    );
  
    return results;
}   

}