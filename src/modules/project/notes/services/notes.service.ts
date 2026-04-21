import { CreateNoteInput, UpdateNoteInput } from "../dtos";
import { NotesRepository } from "../Repositories";
import { FileObject } from "../../../../shared/fileType";
import { resolveUploadFilePath, streamFile } from "../../../../utils/fileUtil";
import { Response } from "express";
import { AppError } from "../../../../config/utils/AppError";
import { notifyProjectStakeholdersByRole } from "../../../../utils/notifyProjectStakeholders";



const notesRepository = new NotesRepository();
export class NotesService {
    async create(data: CreateNoteInput) {
        const newNotes = notesRepository.create(data);
        const project = (await newNotes).project;
        const projectId = (project as any)?.id ?? data.projectId;

        if (projectId) {
            await notifyProjectStakeholdersByRole(
                projectId,
                [
                    "ADMIN",
                    "PROJECT_MANAGER",
                    "DEPT_MANAGER",
                    "TEAM_LEAD",
                    "DEPUTY_MANAGER",
                    "OPERATION_EXECUTIVE",
                    "CONNECTION_DESIGNER_ENGINEER",
                    "STAFF",
                ],
                (role) => ({
                    type: "NOTE_CREATED",
                    title: "New Note Created",
                    message: `A new note has been added to the project: ${project?.name}`,
                    projectId,
                    timestamp: new Date(),
                }),
                { excludeUserIds: [(data as any).createdById as string | undefined].filter(Boolean) as string[] } // exclude the note creator
            );
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

    async findAll(projectId: string) {
        return await notesRepository.findAll(projectId);
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
          
              const filePath = resolveUploadFilePath(fileObject);
              if (!filePath) {
                  console.error("🚨 [viewFile] File does not exist on disk:", filePath);
                  throw new AppError("File not found on server", 404);
                }
          
              return streamFile(res, filePath, fileObject.originalName);
       
     }
}
