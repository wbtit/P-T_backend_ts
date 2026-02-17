import prisma from "../../../../config/database/client";
import { CreateNoteInput,UpdateNoteInput } from "../dtos";
import { generateProjectScopedSerial, SERIAL_PREFIX } from "../../../../utils/serial.util";

export class NotesRepository{
    async create(data:CreateNoteInput ) {
        return await prisma.$transaction(async (tx) => {
            const project = await tx.project.findUnique({
                where: { id: data.projectId },
                select: { projectCode: true, projectNumber: true },
            });

            const serialNo = await generateProjectScopedSerial(tx, {
                prefix: SERIAL_PREFIX.NOTES,
                projectScopeId: data.projectId,
                projectToken: project?.projectCode ?? project?.projectNumber ?? data.projectId,
            });

            return tx.notes.create({
                data: {
                    ...data,
                    serialNo,
                },
                include:{
                    project:{
                        select:{
                            tasks:true,
                            managerID:true,
                            name:true,
                            department:{select:{managerIds:{select:{id:true}}}}
                        }
                    }
                }
            });
        });
    }

    async update(id: string, data:UpdateNoteInput ) {;
        return await prisma.notes.update({
            where: { id },
            data: data
        });
    }

    async delete(id: string) {
        return await prisma.notes.delete({
            where: { id }
        });
    }

    async findById(id: string) {
        return await prisma.notes.findUnique({
            where: { id }
        });
    }

    async findAll() {
        return await prisma.notes.findMany();
    }
}
