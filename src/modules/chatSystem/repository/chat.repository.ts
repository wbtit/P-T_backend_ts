import prisma from "../../../config/database/client";

export class ChatRepository{
    async createGroup(name:string,userId:string){
       return await prisma.group.create({
       data:{
        name,
        adminId:userId
       }
       })
    }
    async createGroupUser(memberId:string,groupId:string){
        return await prisma.groupUser.create({
            data:{
                memberId,
                groupId
            }
        })
    }
    async addMembersToGroup(memberIds:string[],groupId:string){
        return await Promise.all(
        memberIds.map((id) =>
          prisma.groupUser.create({
            data: {
              memberId: id,
              groupId: groupId,
            },
          })
        )
      );
    }
    async getGroupChats(groupId:string,lastMessageId:string,limit:string){
        return await prisma.message.findMany({
            where:{groupId:groupId},
            include:{
                sender:true,
                taggedUsers :true,
            },
            ...(lastMessageId && {
                skip: 1,
                cursor: { id: lastMessageId },
              }),
              take: parseInt(limit),
            orderBy:{createdAt:'desc'},
            
        })
    }
    async getPrivateChats(user1:string,user2:string,lastMessageId:string,limit:string){
        return await prisma.message.findMany({
            where:{
                OR:[
                    {senderId:user1,receiverId:user2},
                    {senderId:user2,receiverId:user1},
                ]
            },
            include:{
                sender:true,
                receiver:true
            },
            ...(lastMessageId && {
                skip: 1,
                cursor: { id: lastMessageId },
              }),
              take: parseInt(limit),  
            orderBy:{createdAt:'desc'}
        })
    }
    async privateMessages(id:string){
        return await prisma.message.findMany({
      where: {
        OR: [{ senderId: id }, { receiverId: id }],
        receiverId: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    });
    }

    async fetchUserData(otherUserId:string){
        return await prisma.user.findUnique({
          where: { id: otherUserId },
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            username: true,
            role: true
          }
        });
    }
    async getGroupMembership(id:string){
        return await prisma.groupUser.findMany({
      where: { memberId: id },
      select: { groupId: true }
    });
    }

    async getGroupMember(memberId:string,groupId:string){
        return await prisma.groupUser.findFirst({
        where:{
          memberId:memberId,
          groupId:groupId
        }
      })
    }

    async getGroupMessages(groupIds:string[]){
        return await prisma.message.findMany({
      where: { groupId: { in: groupIds } },
      orderBy: { createdAt: 'desc' }
    });

    }
    async findGroup(msg:any){
        return await prisma.group.findUnique({ where: { id: msg.groupId } });
    }
    async allGroups(groupIds:string[]){
        return await prisma.group.findMany({
      where: { id: { in: groupIds } }
    });

    }
    async deleteGroupMember(id:string){
        return await prisma.groupUser.delete({
        where:{id:id}
      })
    }
    async getGroupMembers(groupId:string){
        return await prisma.group.findUnique({
        where:{id:groupId},
        include:{
          members:{
            include:{
              members:true
            }
          }
        }
      })
    }
    async deleteGroup(groupId:string){
        return await prisma.group.delete({where:{id:groupId}})
    }
}