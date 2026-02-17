import { EstManagementRepository } from "../repositories";
import { AppError } from "../../../../config/utils/AppError";
import { CreateEstimationDtoType,UpdateEstimationDtoType } from "../dtos";
import { FileObject } from "../../../../shared/fileType";
import { EstimationStatus } from "@prisma/client";
import { streamFile } from "../../../../utils/fileUtil";
import path from "path";
import { Response } from "express";
import prisma from "../../../../config/database/client";
import {
    generateProjectScopedSerial,
    SERIAL_PREFIX,
} from "../../../../utils/serial.util";



const estManage= new EstManagementRepository();

export class EstimationManageService{
    async create(data:CreateEstimationDtoType,createdById:string){
        const estimantion = await prisma.$transaction(async (tx) => {
            let projectScopeId = `EST_PROJECT:${data.projectName.toUpperCase()}`;
            let projectToken = data.projectName;

            if (data.rfqId) {
                const rfq = await tx.rFQ.findUnique({
                    where: { id: data.rfqId },
                    select: { projectNumber: true, project: { select: { id: true, projectCode: true } } },
                });

                if (rfq?.project?.id) {
                    projectScopeId = rfq.project.id;
                    projectToken = rfq.project.projectCode ?? rfq.projectNumber ?? data.projectName;
                } else if (rfq?.projectNumber) {
                    projectScopeId = `PROJECT_NUMBER:${rfq.projectNumber.toUpperCase()}`;
                    projectToken = rfq.projectNumber;
                }
            }

            const serialNo = await generateProjectScopedSerial(tx, {
                prefix: SERIAL_PREFIX.ESTIMATION,
                projectScopeId,
                projectToken,
            });

            return estManage.createWithTx(
                tx,
                {
                    ...data,
                    serialNo,
                    estimationNumber: serialNo,
                },
                createdById
            );
        });

        return estimantion
    }
    async getAll(){
        return await estManage.getAll();
    }
    async getById(id:string){
        return await estManage.getById(id)
    }
    async getByCreatorId(id:string){
        return await estManage.getByCreatorId(id);
    }
    async update(id:string,data:UpdateEstimationDtoType){
        const existing = await estManage.getById(id)
        if (!existing) {
            throw new AppError("Estimation not found",404)
        }

        const existingFiles = (existing.files as unknown as FileObject[]) ?? []
        const newFiles = (data.files as unknown as FileObject[]) ?? []

        const updateData: UpdateEstimationDtoType = {
            ...data,
            ...(newFiles.length ? { files: [...existingFiles, ...newFiles] } : {}),
        }

        if (Object.keys(updateData).length === 0) {
            throw new AppError("At least one field is required for update",400)
        }

        return await estManage.update(id,updateData)
    }
    async delete(id:string){
        return await estManage.delete(id)
    }
    async updateStatus(id:string,status:EstimationStatus){
        return await estManage.updateStatus(id,status)
    }
    async setPrice(id:string,finalPrice:number){
        return await estManage.setFinalPrice(id,finalPrice)
    }
    async viewFile(estimationId: string, fileId: string,res:Response) {
       const estimation = await estManage.getById(estimationId );
       if (!estimation) {
         throw new AppError("Estimation not found", 404);
       }
       const files = estimation.files as unknown as FileObject[];
       const file = files.find((file:FileObject) => file.id === fileId);
       if (!file) {
         throw new AppError("File not found", 404);
       }
        const __dirname=path.resolve();
        const filePath = path.join(__dirname,"public", file.filename);
        return streamFile(res, filePath, file.originalName);
       
     }
     async getFile(estimationId: string, fileId: string) {
        const estimation = await estManage.getById(estimationId);
        if (!estimation) {
          throw new AppError("estimation not found", 404);
        }
        const files = estimation.files as unknown as FileObject[];
        const file = files.find((file:FileObject) => file.id === fileId);
        if (!file) {
          throw new AppError("File not found", 404);
        }
         return file;
        
      }
}
