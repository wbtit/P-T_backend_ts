import { Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import {getIntentFromGemini,summarizeWithGemini} from "../utils/geminiClient"
import { TaskService } from "../../tasks";
import { ProjectService } from "../../project";
import { COService } from "../../CO";
import { CommentService } from "../../comments";
import { DeptService } from "../../department";
import { DesignDrawingsService } from "../../designDrawings/services";
import { EstimationTaskService } from "../../estimation/estimationTask/services/estTask.service";
import { EstimationManageService } from "../../estimation/management";
import { FabricatorService } from "../../fabricator";
import { MeetingService } from "../../meetings/services";
import { MeetingAttendeeService } from "../../meetings/services";
import { MileStoneService } from "../../milestone";
import { NotificationService } from "../../notifications/service";
import { RFIService } from "../../RFI";
import { RFIResponseService } from "../../RFI";
import { RFQService } from "../../RFQ";
import { RfqResponseService } from "../../RFQ/RFQresponse";
import { SubmittalService } from "../../submittals";
import { SubmittalResponseService } from "../../submittals";
import { TeamService } from "../../team";
import { EmployeeServices } from "../../user/employee";
import { EstWHService } from "../../workingHours";
import { WHService } from "../../workingHours";
import { validateIntentForRole } from "../utils/roleUtils";
import { AppError } from "../../../config/utils/AppError";


export const agnetQueryController=async(req:AuthenticateRequest,res:Response)=>{
        const {query} = req.body;
        const user = req.user;

        const intent = await getIntentFromGemini(query);
        if(!user){
            throw new AppError("user data is required",401);
        }
        const allowed = validateIntentForRole(user?.role,intent.type);
        if(!allowed) return res.status(403).json({
            message:"Unauthorized access"
        });
        let data:any
        switch (intent.type) {
            // case "GET_TASKS_DUE_THIS_WEEK":
            //   data = await TaskService.getTasksDueThisWeek(user.id);
            //   break;

            // case "GET_PROJECT_PROGRESS":
            //   data = await ProjectService.getProjectProgress(intent.projectId);
            //   break;

            // default:
            //   return res.status(400).json({ message: "Unknown intent type" });
        }
        const summary = await summarizeWithGemini(user.role, data);
        return res.json({message:summary,data});

}