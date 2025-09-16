import { commentDto } from "../dtos";
import { CommentRepository } from "../repositories";

const commentRepo= new CommentRepository();

export class CommentService{
    async create(data:commentDto,user_id:string){
        return await commentRepo.create(data,user_id);
    }
    async update(id:string){
        return await commentRepo.update(id);
    }
    async findByTask(id:string){
        return await commentRepo.getByTaskId(id);
    }
    async findByUserId(id:string){
        return await commentRepo.getByUserId(id)
    }
}