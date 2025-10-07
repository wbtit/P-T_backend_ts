import { CreateCoResponseDto } from "../dtos";
import { CoResponseRepository } from "../repositories";

export class CoResponseService {
  private coResponseRepository: CoResponseRepository;

  constructor() {
    this.coResponseRepository = new CoResponseRepository();
  }

  async createCoResponse(data: CreateCoResponseDto, CoId: string, userId: string) {
    if(data.parentResponseId){
        return await this.coResponseRepository.createCoResponse(data);
    }else{
        throw new Error("ParentResponseId is required for top-level responses");
    }
    
  }

  async getResponseById(id: string) {
    return await this.coResponseRepository.getResponseById(id);
  }
}