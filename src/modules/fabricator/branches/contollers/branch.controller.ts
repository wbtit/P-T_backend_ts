import { Request,Response } from "express";
import { AppError } from "../../../../config/utils/AppError";
import { BranchService } from "../services";

export class BranchController{
private branchService: BranchService;

constructor() {
    this.branchService = new BranchService();
}

async createBranch(req: Request, res: Response) {
    const existingBranch = await this.branchService.findBranchByName(req.body.name);
   if (!existingBranch) {
       throw new AppError("Branch with this name already exists", 400);
   }
   const branch = await this.branchService.createBranch(req.body);
   return res.status(201).json({
    message:"Branch created successfully",
    data: branch
   });
}

async deleteBranch(req: Request, res: Response) {
     const existingBranch = await this.branchService.findBranchByName(req.body.name);
   if (!existingBranch) {
       throw new AppError("Branch with this name does not exist", 404);
   }
    const { id } = req.params;
   await this.branchService.deleteBranch({id});
   return res.status(204).json({
    message:"Branch deleted successfully"
   });
}

}
