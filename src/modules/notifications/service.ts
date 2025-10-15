import { NotificationRepository } from "./repository";


const notifyRepo = new NotificationRepository();

export class NotificationService{
    async get(userId:string){
        return await notifyRepo.get(userId)
    }
    async update(id:string){
        return await notifyRepo.update(id)
    }
}