import { CreateNoteInput, UpdateNoteInput } from "../dtos";
import { NotesRepository } from "../Repositories";
import { FileObject } from "../../../../shared/fileType";
import { streamFile } from "../../../../utils/fileUtil";
import path from "path";
import { Response } from "express";
import { AppError } from "../../../../config/utils/AppError";


const notesRepository = new NotesRepository();
export class NotesService {
    async create(data: CreateNoteInput) {
        return await notesRepository.create(data);
    }

    async update(id: string, data: UpdateNoteInput) {
        return await notesRepository.update(id, data);
    }

    async delete(id: string) {
        return await notesRepository.delete(id);
    }

    async findById(id: string) {
        return await notesRepository.findById(id);
    }

    async findAll() {
        return await notesRepository.findAll();
    }
    async getFile(notesId: string, fileId: string) {
       const notes = await notesRepository.findById(notesId);
       if (!notes) {
         throw new AppError("Notes not found", 404);
       }
       const files = notes.files as unknown as FileObject[];
       const file = files.find((file:FileObject) => file.id === fileId);
       if (!file) {
         throw new AppError("File not found", 404);
       }
        return file;
       
     }
    
       async viewFile(notesId: string, fileId: string,res:Response) {
       const notes = await notesRepository.findById(notesId);
       if (!notes) {
         throw new AppError("Notes not found", 404);
       }
       const files = notes.files as unknown as FileObject[];
       const file = files.find((file:FileObject) => file.id === fileId);
       if (!file) {
         throw new AppError("File not found", 404);
       }
        const __dirname=path.resolve();
        const filePath = path.join(__dirname, file.filename);
        return streamFile(res, filePath, file.originalName);
       
     }
}