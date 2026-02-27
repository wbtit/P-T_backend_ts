import { CreateNoteInput, UpdateNoteInput } from "../dtos";
import { NotesRepository } from "../Repositories";
import { FileObject } from "../../../../shared/fileType";
import { streamFile } from "../../../../utils/fileUtil";
import path from "path";
import { Response } from "express";
import { AppError } from "../../../../config/utils/AppError";
import { getActiveUserIdsByRoles, notifyUsers } from "../../../../utils/notifyByRole";
import fs from 'fs'



const notesRepository = new NotesRepository();
export class NotesService {
    async create(data: CreateNoteInput) {
        const newNotes = notesRepository.create(data);
        const project = (await newNotes).project;
        const payload = {
            title: "New Note Created",
            message: `A new note has been added to the project: ${project?.name}`,
            projectName: project?.name,
        };

        const recipientIds = new Set<string>();

        // Notification matrix (1.10): ADM, DM, PM

        // PM
        if (project && project.managerID) {
            recipientIds.add(project.managerID);
        }

        // DM
        if (project && project.department && project.department.managerIds) {
            for (const managerId of project.department.managerIds.map(m => m.id)) {
                recipientIds.add(managerId);
            }
        }

        // STF
        if (project && project.tasks) {
            for (const task of project.tasks) {
                if (task.user_id) recipientIds.add(task.user_id);
            }
        }

        // ADM + TL + OE + CDE + CLI + FAB
        const roleBasedRecipientIds = await getActiveUserIdsByRoles([
            "ADMIN",
            "TEAM_LEAD",
            "OPERATION_EXECUTIVE",
            "CONNECTION_DESIGNER_ENGINEER",
            "CLIENT",
            "CLIENT_ADMIN",
            "CLIENT_PROJECT_COORDINATOR",
            "VENDOR",
            "VENDOR_ADMIN",
        ]);
        roleBasedRecipientIds.forEach((id) => recipientIds.add(id));

        await notifyUsers(Array.from(recipientIds), payload);

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
