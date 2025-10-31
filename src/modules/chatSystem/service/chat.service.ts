import { AppError } from "../../../config/utils/AppError";
import { decompression } from "../../../utils/Zstd";
import { ChatRepository } from "../repository";


const chatRepo = new ChatRepository();
export class ChatService{

    async createGroup(name:string,userId:string){
        const newGroup = await chatRepo.createGroup(name,userId)
        await chatRepo.createGroupUser(userId,newGroup.id)
        return newGroup
    }

    async addMemberToGroup(memberIds:string[],groupId:string){
        return await chatRepo.addMembersToGroup(memberIds,groupId);
    }

    async groupChatHistory(groupId:string,lastMessageId:string){
        const groupMessages = await chatRepo.getGroupChats(groupId,lastMessageId,"20");
        const decompressedMessages = await Promise.all(
  groupMessages.map(async msg => {
    const content = msg.contentCompressed
      ? await decompression(Buffer.from(msg.contentCompressed))
      : null;

    return {
      ...msg,
      content
    };
  })
);

    return decompressedMessages
    }

    async privateChatHistory(user1:string,user2:string,lastMessageId:string,limit:string){
        const privateChats = await chatRepo.getPrivateChats(user1,user2,lastMessageId,"20")
              const decompressedMessages = await Promise.all(
  privateChats.map(async msg => {
    const content = msg.contentCompressed
      ? await decompression(Buffer.from(msg.contentCompressed))
      : null;

    return {
      ...msg,
      content
    };
  })
);
    return decompressedMessages
    }


    async recentChats(userId:string){
        const pvtMessages = await chatRepo.privateMessages(userId)
        const pvtMap= new Map()

        for(const msg of pvtMessages){
          const otherUserId = msg.senderId=== userId?
          msg.receiverId:
          msg.senderId

          const existing = pvtMap.get(otherUserId)
          if(!existing || new Date(existing.timestamp)< new Date(msg.createdAt)){
            const user = await chatRepo.fetchUserData(userId)
          
          const lastMessage = msg.contentCompressed?
          await decompression(Buffer.from(msg.contentCompressed)):
          null

          pvtMap.set(otherUserId,{
            type:"private",
            user,
            lastMessage,
            timeStamp:msg.createdAt
          })
        }
        }
        const groupMembership = await chatRepo.getGroupMembership(userId)
        const groupIds = groupMembership.map(g=>g.groupId);
        const groupMessages = await chatRepo.getGroupMessages(groupIds)

        const groupMap = new Map()

        for( const msg of groupMessages){
          const exsiting =groupMap.get(msg.groupId);
          if(!exsiting ||  new Date(exsiting.timestamp) < new Date(msg.createdAt)){
            const group = await chatRepo.findGroup(msg.groupId)
            const lastMessage = msg.contentCompressed
          ? await decompression(Buffer.from(msg.contentCompressed))
          : null;

        groupMap.set(msg.groupId, {
          type: "group",
          group,
          lastMessage,
          timestamp: msg.createdAt
        });
      }
          }

          const allGroups = await chatRepo.allGroups(groupIds)
           const groupChatsSidebarItems = allGroups.map(group => {
            const msgInfo = groupMap.get(group.id) || {};
            return {
              type: "group",
              group,
              lastMessage: msgInfo.lastMessage || null,
              timestamp: msgInfo.timestamp || null
            };
    });
    const combinedChats = [
      ...pvtMap.values(),
      ...groupChatsSidebarItems
    ].sort((a, b) => {
  const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
  const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
  return timeB - timeA;
});

        
  return combinedChats;
  }


async deleteMembersInGroup(groupId:string,memberId:string){
    const groupmember = await chatRepo.getGroupMember(memberId,groupId)
    if(!groupmember){
      throw new AppError("No such user in the Group ",404)
    }
    await chatRepo.deleteGroupMember(groupmember.id)
}

async getGroupMembers(groupId:string){
      return await chatRepo.getGroupMembers(groupId);
}

async deleteGroup(groupId:string){
  return await chatRepo.deleteGroup(groupId);
}
    }
