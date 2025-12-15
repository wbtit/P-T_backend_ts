import { WbsRepository } from "../repositories";
import { WBSInput,UpdateWBSInput, UpdateWBSSchema } from "../dtos";
import { Stage,Activity } from "@prisma/client";
import { PLIRepository } from "../../projectLineItems";
import { ProjectRepository } from "../../repositories";
import { AppError } from "../../../../config/utils/AppError";
import prisma from "../../../../config/database/client";


const wbsRepository = new WbsRepository();
const pliRepository = new PLIRepository();
const projectRepository = new ProjectRepository();

export class WbsService {

    async  list() {
  return prisma.wbsTemplate.findMany({
    where: {
      isActive: true,
      isDeleted: false,
    },
    include: {
      lineItems: {
        where: {
          isActive: true,
          isDeleted: false,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}


  async create(data: {
  name: string;
  type: Activity;
  templateKey: string;
  lineItems: {
    description: string;
    unitTime: number;
    checkUnitTime: number;
  }[];
}) {
  return prisma.$transaction(async tx => {
    // prevent duplicate templateKey+version
    const existing = await tx.wbsTemplate.findFirst({
      where: {
        templateKey: data.templateKey,
        version: 1,
      },
    });

    if (existing) {
      throw new AppError("Template already exists", 409);
    }

    const template = await tx.wbsTemplate.create({
      data: {
        name: data.name,
        type: data.type,
        templateKey: data.templateKey,
        version: 1,
      },
    });

    await tx.wbsLineItemTemplate.createMany({
      data: data.lineItems.map((li, index) => ({
        wbsTemplateId: template.id,
        description: li.description,
        unitTime: li.unitTime,
        checkUnitTime: li.checkUnitTime,
        templateKey: `${data.templateKey}-${index + 1}`,
      })),
    });

    return template;
  });
}

    
async getProjectDashboardStats(
  projectId: string,
  stage: Stage
) {
  return wbsRepository.getProjectDashboardStats(
    projectId,
    stage
  );
}

async getActivityDashboardStats(
  projectId: string,
  stage: Stage
) {
  return wbsRepository.getActivityDashboardStats(
    projectId,
    stage
  );
}

  async getWbsStats(projectId: string,stage: Stage,type: Activity) {
  const project = await projectRepository.get({ id: projectId });
  if (!project) throw new Error("Project not found");

  const estimatedMins = (project.estimatedHours || 0) * 60;

  // 1️⃣ Fetch WBS + LineItems
  const wbsList = await wbsRepository.getProjectWbs(
    projectId,
    stage,
    type
  );

  // 2️⃣ Project-level totals
  const projectTotals =
    await wbsRepository.getTotalProjectWbsHours(
      projectId,
      stage
    );

  const totalSubTaskHours =
    (projectTotals._sum.totalExecHr || 0) +
    (projectTotals._sum.totalCheckHr || 0);

  const reworkPercentage = estimatedMins
    ? ((estimatedMins - totalSubTaskHours) / estimatedMins) * 100
    : 0;

  const divisor = wbsList.length || 1;
  const reworkPercentPerWbs = reworkPercentage / divisor;

  // 3️⃣ Per-WBS computation
  const results = await Promise.all(
    wbsList.map(async (wbs) => {
      const items = wbs.lineItems;

      const execHr = items.reduce(
        (sum, i) => sum + (i.execHr || 0),
        0
      );
      const checkHr = items.reduce(
        (sum, i) => sum + (i.checkHr || 0),
        0
      );
      const qtyNo = items.reduce(
        (sum, i) => sum + (i.qtyNo || 0),
        0
      );

      const totalExecHrWithRework =
        execHr * reworkPercentPerWbs;
      const totalCheckHrWithRework =
        checkHr * reworkPercentPerWbs;

      await wbsRepository.updateProjectWbs(wbs.id, {
        totalQtyNo: qtyNo,
        totalExecHr: execHr,
        totalCheckHr: checkHr,
        totalExecHrWithRework,
        totalCheckHrWithRework,
      });

      return {
        id: wbs.id,
        name: wbs.name,
        totalQtyNo: qtyNo,
        totalExecHr: execHr,
        totalCheckHr: checkHr,
        totalExecHrWithRework,
        totalCheckHrWithRework,
        reworkPercentage,
        reworkPercentPerWbs,
        lineItems: items,
      };
    })
  );

  return results;
}
   

}