import prisma from "../../../../config/database/client";
import { CreateNoteInput,UpdateNoteInput } from "../dtos";

export class NotesRepository{
    async create(data:CreateNoteInput ) {
        return await prisma.notes.create({
            data: data,
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