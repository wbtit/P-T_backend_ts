import { CreateNoteInput, UpdateNoteInput } from "../dtos";
import { NotesRepository } from "../Repositories";
import { FileObject } from "../../../../shared/fileType";
import { streamFile } from "../../../../utils/fileUtil";
import path from "path";
import { Response } from "express";
import { AppError } from "../../../../config/utils/AppError";
import { sendNotification } from "../../../../utils/sendNotification";
import fs from 'fs'



const notesRepository = new NotesRepository();
export class NotesService {
    async create(data: CreateNoteInput) {
        const newNotes = notesRepository.create(data);
        // Notify project manager about the new note
        const project = (await newNotes).project;
        if (project && project.managerID) {
            const payload = {
                title: "New Note Created",
                message: `A new note has been added to the project: ${project.name}`,
                projectName: project.name,
            };
            await sendNotification(project.managerID, payload);
        }
        // Notify department managers about the new note
        if (project && project.department && project.department.managerIds) {
            const payload = {
                title: "New Note Created",
                message: `A new note has been added to the project: ${project.name}`,
                projectName: project.name,
            };
            for (const managerId of project.department.managerIds.map(m => m.id)) {
                await sendNotification(managerId, payload);
            }
        }
        //Notify the task assignees about the new note
        if (project && project.tasks) {
            const payload = {
                title: "New Note Created",
                message: `A new note has been added to the project: ${project.name}`,
                projectName: project.name,
            };
            for (const task of project.tasks) {
                if (task.user_id) {
                    await sendNotification(task.user_id, payload);
                }
            }
        }
        return newNotes;
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
       const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
             const fileObject = files.find((file: FileObject) => file.id === cleanFileId);
             if (!fileObject) {
                console.warn("⚠️ [viewFile] File not found in fabricator.files", {
                  fileId,
                  availableFileIds: files.map(f => f.id),
                });
                throw new AppError("File not found", 404);
              }
          
              const __dirname = path.resolve();
              const filePath = path.join(__dirname, "public", fileObject.path);
              if (!fs.existsSync(filePath)) {
                  console.error("🚨 [viewFile] File does not exist on disk:", filePath);
                  throw new AppError("File not found on server", 404);
                }
          
              return streamFile(res, filePath, fileObject.originalName);
       
     }
}