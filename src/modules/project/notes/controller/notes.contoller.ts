import { Response,Request } from "express";
import { NotesService } from "../services";
import { mapUploadedFiles } from "../../../uploads/fileUtil"; 

const notesService = new NotesService();

export class NotesController {
    async create(req: Request, res: Response) {
        
            const data = req.body;
            const files = mapUploadedFiles((req.files as Express.Multer.File[]) || [],
          "notes");
            const note = await notesService.create({ ...data, files });
            return res.status(201).json(note);
    }

    async update(req: Request, res: Response) {

            const { id } = req.params;
            const data = req.body;
            const files = mapUploadedFiles((req.files as Express.Multer.File[]) || [],
          "notes");
            const note = await notesService.update(id, { ...data, files });
            return res.status(200).json(note);
    }

    async delete(req: Request, res: Response) {
            const { id } = req.params;
            await notesService.delete(id);
            return res.status(204).send();
        
    }

    async findById(req: Request, res: Response) {
             const { id } = req.params;
            const note = await notesService.findById(id);
            return res.status(200).json(note);
    }

    async findAll(req: Request, res: Response) {
            const notes = await notesService.findAll();
            return res.status(200).json(notes);
    
    }

    async getFile(req: Request, res: Response) {
            const { notesId, fileId } = req.params;
            const file = await notesService.getFile(notesId, fileId);
            return res.status(200).json(file);
    }

    async viewFile(req: Request, res: Response) {
            const { notesId, fileId } = req.params;
            await notesService.viewFile(notesId, fileId, res);
        
    }
}