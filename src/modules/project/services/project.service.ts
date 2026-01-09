import { Stage } from "@prisma/client";
import prisma from "../../../config/database/client";
import { AppError } from "../../../config/utils/AppError";
import { CreateProjectInput,
  UpdateprojectInput,
  GetProjectInput,
  DeleteProjectInput
 } from "../dtos";
import { ProjectRepository } from "../repositories";
import { createWBSAndProjectLineItems } from "../WBS/utils/wbs.util";
import { Prisma } from "@prisma/client";
import { FileObject } from "../../../shared/fileType";
import { streamFile } from "../../../utils/fileUtil";
import path from "path";
import { Response } from "express";
import { UserJwt } from "../../../shared/types";
import { updateProjectStage } from "../utils/updateProjectStage";
import { handleStageChange } from "../utils/handleStageChange";
import { handleEndDateChange } from "../utils/handleEndDateChange";

 const projectRepository = new ProjectRepository();

 export class ProjectService {
   
  
  async create(data: CreateProjectInput,userId:string) {
     const existing = await projectRepository.getByProjectNumber(data.projectNumber);
     if (existing) {
       throw new AppError("Project with this number already exists", 409);
     }
     const project = await projectRepository.create(data,userId);
     return project;
   }
   async update(data: UpdateprojectInput, id: string) {
  return prisma.$transaction(async tx => {
    // 1️⃣ Load current state
    const existing = await tx.project.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError("Project not found", 404);
    }

    // 2️⃣ Detect changes
    const stageChanged =
      data.stage && existing.stage !== data.stage;

    const endDateChanged =
      "endDate" in data && existing.endDate !== data.endDate;

    const approvalDateChanged =
      "approvalDate" in data &&
      existing.approvalDate !== data.approvalDate;

    // 3️⃣ Stage change side-effects
    if (stageChanged) {
      await handleStageChange(
        tx,
        id,
        existing.stage,
        data.stage as Stage
      );
    }

    // 4️⃣ End-date side-effects
    if (endDateChanged) {
      handleEndDateChange(existing, data);
    }

    // 5️⃣ Approval-date side-effects
    if (approvalDateChanged) {
      data.mailReminder = false;
    }

    // 6️⃣ Persist project update (generic)
    const project = await projectRepository.updateWithTx(
      tx,
      id,
      data
    );

    return project;
  });
}

async expandProjectWbs(
  projectId: string,
  bundleKeys: string[],
  userId: string
) {
  return prisma.$transaction(async tx => {
    // 1️⃣ Load project (need current stage)
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: { stage: true },
    });

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    const currentStage = project.stage;

    // 2️⃣ Fetch existing selections
    const existingSelections = await tx.projectBundleSelection.findMany({
      where: { projectId },
      select: { bundleKey: true },
    });

    const selectedSet = new Set(
      existingSelections.map((s: any) => s.bundleKey)
    );

    // 3️⃣ Filter only NEW bundles
    const newBundleKeys = bundleKeys.filter(
      key => !selectedSet.has(key)
    );

    if (newBundleKeys.length === 0) {
      return { added: 0, message: "No new WBS to add" };
    }

    // 4️⃣ Persist new selections
    await tx.projectBundleSelection.createMany({
      data: newBundleKeys.map(bundleKey => ({
        projectId,
        bundleKey,
        selectedBy: userId,
      })),
    });

    // 5️⃣ Create ProjectBundle + ProjectWbs + LineItems (CURRENT STAGE ONLY)
    for (const bundleKey of newBundleKeys) {
      // Create ProjectBundle
      const projectBundle = await tx.projectBundle.create({
        data: {
          projectId,
          bundleKey,
          stage: currentStage,
        },
      });

      // Get templates in this bundle
      const bundle = await tx.wbsBundleTemplate.findUnique({
        where: { bundleKey },
        include: {
          wbsTemplates: {
            include: { lineItems: true }
          }
        },
      });

      if (!bundle) continue;

      for (const tpl of bundle.wbsTemplates) {
        const exists = await tx.projectWbs.findFirst({
          where: {
            projectBundleId: projectBundle.id,
            wbsTemplateKey: tpl.templateKey,
          },
        });

        if (exists) continue;

        const wbs = await tx.projectWbs.create({
          data: {
            projectId,
            projectBundleId: projectBundle.id,
            wbsTemplateKey: tpl.templateKey,
            discipline: tpl.discipline,
            stage: currentStage,
          },
        });

        await tx.projectLineItem.createMany({
          data: tpl.lineItems.map((li: any) => ({
            projectWbsId: wbs.id,
            lineItemTemplateId: li.id,
            description: li.description,
            unitTime: li.unitTime,
            checkUnitTime: li.checkUnitTime,
          })),
        });
      }
    }

    return {
      added: newBundleKeys.length,
      stage: currentStage,
    };
  });
}


  
   async get(data: GetProjectInput) {
     const project = await projectRepository.get(data);
     return project;
   }

   async delete(data: DeleteProjectInput) {
    const existing = await projectRepository.get({ id: data.id });
     if (!existing) {
       throw new AppError("Project not found", 404);
     }
     const project = await projectRepository.delete(data);
     return project;
   }

   async getAll(id:string) {
    const user = await prisma.user.findUnique({where:{id}});
    if(!user){
      throw new AppError("User not found", 404);
    }
     let projects;
     if(user.role==="ADMIN"|| user.role==="SYSTEM_ADMIN"|| user.role==="PROJECT_MANAGER_OFFICER"
      || user.role==="DEPUTY_MANAGER"|| user.role==="OPERATION_EXECUTIVE"){
        //all projects
        projects = await projectRepository.getAll();
     }
     if(user.role==="PROJECT_MANAGER"|| user.role ==="TEAM_LEAD"){
      //only his project 
      projects = await projectRepository.getForProjectManager(user.id);
     }  
     if(user.role==="DEPT_MANAGER"){
      //only of his department
      projects = await projectRepository.getForDepartmentManager(user.departmentId!);
     }
     if(user.role==="CONNECTION_DESIGNER_ENGINEER"){
      //only his assigned projects
      projects = await projectRepository.getForConnectionDesignerEngineer(user.id);
     }
     if(user.role==="CLIENT_ADMIN"){
      //acts as fab represnentative
      projects = await projectRepository.getProjectsForClientAdmin(user.id);
     }
     if(user.role==="CLIENT"){
      //acts as point of contact
      projects = await projectRepository.getProjectsForClient(user.id);
     }

     return projects;
   }

  async getFile(projectId: string, fileId: string) {
   const project = await projectRepository.get({ id: projectId });
   if (!project) {
     throw new AppError("Project not found", 404);
   }
   const files = project.files as unknown as FileObject[];
   const file = files.find((file:FileObject) => file.id === fileId);
   if (!file) {
     throw new AppError("File not found", 404);
   }
    return file;
   
 }

   async viewFile(projectId: string, fileId: string,res:Response) {
   const project = await projectRepository.get({ id: projectId });
   if (!project) {
     throw new AppError("Project not found", 404);
   }
   const files = project.files as unknown as FileObject[];
   const file = files.find((file:FileObject) => file.id === fileId);
   if (!file) {
     throw new AppError("File not found", 404);
   }
    const __dirname=path.resolve();
    const filePath = path.join(__dirname, file.filename);
    return streamFile(res, filePath, file.originalName);
   
 }
 async getProjectUpdateHistoryByProjectId(projectId: string) {
   const updateHistory = await projectRepository.getProjectUpdateHistoryByProjectId(projectId);
   return updateHistory;
 }
}
