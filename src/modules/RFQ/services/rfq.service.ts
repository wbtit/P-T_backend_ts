import { RFQRepository } from "../repositeries";
import { CreateRfqInput,
    GetRfqInput,
    UpdateRfqInput
 } from "../dtos";
import { AppError } from "../../../config/utils/AppError";

const rfqrepo= new RFQRepository();

export class RFQService {
    async createRfq(data:CreateRfqInput,createdById:string){
        const existing = await rfqrepo.getByName(data.projectNumber);
        if(existing) throw new AppError('RFQ with this project number already exists', 409);

        const rfq = await rfqrepo.create(data,createdById);
        return rfq;
    }
    async updateRfq(id:string,data:UpdateRfqInput){
        const existing = await rfqrepo.getById({id});
        if(!existing) throw new AppError('RFQ not found', 404);

        const rfq = await rfqrepo.update(id,data);
        return rfq;
    }
    async getRfqById(data:GetRfqInput){
        const existing = await rfqrepo.getById(data);
        if(!existing) throw new AppError('RFQ not found', 404);

        return existing;
    }
    async sents(senderId:string){
        return await rfqrepo.sentTouser(senderId);
    }
    async received(recipientId:string){
        return await rfqrepo.Inbox(recipientId);
    }
    async closeRfq(id:string){
        return await rfqrepo.closeRfq(id);
    }
}