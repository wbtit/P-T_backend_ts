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
