import { RfqResponseRepository } from "../repositories";
import { CreateRFQResponseInput,GetRFQResponseInput } from "../dtos";
import { RFQRepository } from "../../repositeries";
import { AppError } from "../../../../config/utils/AppError";

export class RfqResponseService {
    private repository = new RfqResponseRepository();
    private rfqRepository = new RFQRepository();

    async create(data: CreateRFQResponseInput) {
        const rfqToInReview = await this.rfqRepository.update(data.rfqId, { status: 'IN_REVIEW' });
        if (!rfqToInReview) {
            throw new AppError("RFQ not found", 404);
        }
        if(data.parentResponseId){
            await this.repository.update(
                data.parentResponseId,
                data.status,
                data.status
            );
        }
        const createdResponse = await this.repository.create(data);
        return createdResponse;
    }

    async getById(params: GetRFQResponseInput) {
        return await this.repository.getById(params);
    }
}
