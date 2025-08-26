import { BranchRepository } from "../repositories";
import { CreateBranchInput, DeleteBranchInput } from "../dtos";

export class BranchService {
    private branchRepository: BranchRepository;

    constructor() {
        this.branchRepository = new BranchRepository();
    }

    async createBranch(input: CreateBranchInput) {
        return await this.branchRepository.createBranch(input);
    }

    async deleteBranch(input: DeleteBranchInput) {
        return await this.branchRepository.deleteBranch(input);
    }

    async findBranchByName(name: string) {
        return await this.branchRepository.findByName(name);
    }
}