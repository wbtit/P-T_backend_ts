import { CreateCoResponseDto } from "../dtos";
import { CoResponseRepository } from "../repositories";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import path from "path";
import { streamFile } from "../../../utils/fileUtil";
import { Response } from "express";
import prisma from "../../../config/database/client";
import changeOrderInvoiceRequestTemplate from "../../../services/mailServices/mailtemplates/changeOrderApprovedInvoice";
import { transporter } from "../../../services/mailServices/transporter";

const coResponseRepo = new CoResponseRepository();

export class CoResponseService {
  async createCoResponse(data: CreateCoResponseDto, CoId: string, userId: string) {
   
    const changeOrder = await prisma.changeOrder.findUnique({
      where:{id:CoId},
      include:{
        Project:true
      }
    });
    if(!changeOrder){
      throw new AppError("Change Order not found",404);
    }
    const response = await coResponseRepo.createCoResponse(
      data,
      CoId,
      userId,
    );
    if(response.Status ==="ACCEPT"){
      const mailOptions={
              from:process.env.EMAIL,
              to:process.env.PMO_EMAIL,
              subject:`Raise Invoice for the ChangeOrder : ${changeOrder.description}`,
              html:changeOrderInvoiceRequestTemplate(
                changeOrder.Project.name,
                changeOrder.changeOrderNumber,
                response.user.firstName,
                response.createdAt,
                changeOrder.remarks,
                response.user.firstName,
              )
          }
         try {
           await transporter.sendMail(mailOptions)
          await prisma.cOResponse.update({
            where:{id:response.id},
            data:{
              InvoiceAlerted:true
            }
          });
         } catch (error: any) {
          console.log(error.message);
         }
    }
    return response;
  }

  async getResponseById(id: string) {
    const response = await coResponseRepo.getResponseById(id);
    if (!response) throw new AppError("COResponse not found", 404);
    return response;
  }

  async findById(id: string) {
    const response = await coResponseRepo.findbyId(id);
    if (!response) throw new AppError("COResponse not found", 404);
    return response;
  }

  async getFile(coResponseId: string, fileId: string) {
    const response = await coResponseRepo.findbyId(coResponseId);
    if (!response) throw new AppError("COResponse not found", 404);

    const files = response.files as unknown as FileObject[];
    const fileObject = files.find((file: FileObject) => file.id === fileId);
    if (!fileObject) throw new AppError("File not found", 404);

    return fileObject;
  }

  async viewFile(coResponseId: string, fileId: string, res: Response) {
    const fileObject = await this.getFile(coResponseId, fileId);

    const __dirname = path.resolve();
    const filePath = path.join(__dirname,"public", fileObject.filename);

    return streamFile(res, filePath, fileObject.originalName);
  }

  async findByCoId(coId: string) {
    return await coResponseRepo.findbyId(coId);
  }
}
