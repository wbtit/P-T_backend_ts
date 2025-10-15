import prisma from "../../config/database/client";

export class NotificationRepository{
    async get(userId:string){
        return await prisma.notification.findMany({
            where: { userID: userId ,read:false},
            orderBy: { createdAt: 'desc' },
        });
    }
    async update(notificationId:string){
        return await prisma.notification.update({
            where: { id: notificationId },
            data: { read: true },
        });
    }
}