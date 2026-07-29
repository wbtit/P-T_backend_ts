import { Request,Response } from "express";
import { AppError } from "../../../../config/utils/AppError";
import { BranchService } from "../services";

export class BranchController{
private branchService: BranchService;

constructor() {
    this.branchService = new BranchService();
}

async createBranch(req: Request, res: Response) {
    console.log("The req body of the create branch",req.body.name)
   const branch = await this.branchService.createBranch(req.body);
   return res.status(201).json({
    message:"Branch created successfully",
    data: branch
   });
}
async updateBranch(req: Request, res: Response) {
    const { id } = req.params;
    const updatedBranch = await this.branchService.updateBranch({ ...req.body, id });
    return res.status(200).json({
        message:"Branch updated successfully",
       data: updatedBranch
      });
}

async deleteBranch(req: Request, res: Response) {
    const { id } = req.params;
    const existingBranch = await this.branchService.findBranchById(id);
    if (!existingBranch) {
        throw new AppError("Branch does not exist", 404);
    }
   await this.branchService.deleteBranch({id});
   return res.status(204).json({
    message:"Branch deleted successfully"
   });
}

async getBranchById(req: Request, res: Response) {
    const { id } = req.params;
    const branch = await this.branchService.findBranchById(id);
    if (!branch || (branch as any).isDeleted) {
        throw new AppError("Branch not found", 404);
    }
    return res.status(200).json({
        success: true,
        data: branch
    });
}

async getBranchesByFabricatorId(req: Request, res: Response) {
    const { fabricatorId } = req.params;
    const branches = await this.branchService.findBranchesByFabricatorId(fabricatorId);
    return res.status(200).json({
        success: true,
        data: branches
    });
}

}
