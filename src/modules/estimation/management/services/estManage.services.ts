import { EstManagementRepository } from "../repositories";
import { AppError } from "../../../../config/utils/AppError";
import { CreateEstimationDtoType,UpdateEstimationDtoType } from "../dtos";
import { FileObject } from "../../../../shared/fileType";
import { Prisma } from "@prisma/client";
import { streamFile } from "../../../../utils/fileUtil";
import path from "path";
import { Response } from "express";
import createEstimationLineItem from "../utils/estimation.util";

const estManage= new EstManagementRepository();
export class EstimationManageService{
    async create(data:CreateEstimationDtoType){

    }
}