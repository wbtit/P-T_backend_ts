import prisma from "../../../config/database/client";
import { CreateRfiResDto,
    UpdateRFIDto,
    CreateRFIDto,
    UpdateRfiResDto
} from "../dtos";

export class RFIRepository{
    async create(data:CreateRFIDto,userId:string,isAproovedByAdmin:boolean){
        return await prisma.rFI.create({
      data: {
        fabricator_id:data.fabricator_id,
        project_id:data.project_id,
        recepient_id: data.recepient_id,
        sender_id: userId,
        status: true,
        subject:data.subject,
        description:data.description,
        files: data.files,
        isAproovedByAdmin
      },
      include: {
        recepients:  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        project: true,
        sender :  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        rfiresponse:true
      },
    });
    }


    async findById(id:string){
        return await prisma.rFI.findUnique({
      where: { id },
      include: {
        fabricator:{select:{
          fabName:true,
          id:true,
        }},
        project: true,
        sender :  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        recepients: {
          include: {
            managedFabricator: {
              select: {
                fabName: true,
                branches:true,
              },
            },
          },
        },
        rfiresponse: true,
      },
    });
    }


    async updateRFI(id: string, data: UpdateRFIDto) {
        const existing = await prisma.rFI.findUnique({
          where: { id },
        });
    
        if (!existing) {
          throw new Error("RFI not found");
        }
    
        const {
          subject,
          description,
          status,
          isAproovedByAdmin,
          files,
        } = data;
    
        return await prisma.rFI.update({
          where: { id },
          data: {
            subject: subject ?? existing.subject,
            description: description ?? existing.description,
            status: typeof status === "boolean" ? status : existing.status,
            isAproovedByAdmin:
              typeof isAproovedByAdmin === "boolean"
                ? isAproovedByAdmin
                : existing.isAproovedByAdmin,
            files: files ?? existing.files as any,
          },
        });
    }
    
    
    async senderRFI(userId:string){
        return await prisma.rFI.findMany({
      where: {
        sender_id: userId,
      },
      include: {
        fabricator: true,
        project: true,
        recepients: {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        sender : {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        rfiresponse:true,
      },
    });
    }

    async inbox(userId:string){
        return await prisma.rFI.findMany({
      where: {
        recepient_id: userId,
      },
      include: {
        fabricator: true,
        project: true,
        recepients:  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        sender :  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        rfiresponse:true,
      },
    });
    }

    async updateStatus(id:string){
        return await prisma.rFI.update({
      where: {
        id,
      },
      data: {
        status: false,
      },
    });
    }
}