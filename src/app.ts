import express from "express";
import { AuthRoutes } from "./modules/user/auth";
import { EmployeeRoutes } from "./modules/user/employee";
import { fabricatorRoutes } from "./modules/fabricator";
import { TeamRoutes } from "./modules/team";
import { taskRouter } from "./modules/tasks";
import {userRouter} from "./modules/user/"
import { whRoutes } from "./modules/workingHours";
import { CommentRoutes } from "./modules/comments";
import { MileStoneRoutes } from "./modules/milestone";
import { coRouter } from "./modules/CO";
import {projectRoutes} from "./modules/project"
import { NotificationRouter } from "./modules/notifications/routes";
import {agentRoutes}  from "./modules/agent/router"
import { departmentRoutes } from "./modules/department";
import { chatRoutes } from "./modules/chatSystem";
import { ClientRoutes } from "./modules/client";
import { invoiceRoutes } from "./modules/invoice";
import {RFQRoutes} from "./modules/RFQ"
import { CDroutes } from "./modules/connectionDesign";
import { CDQroutes } from "./modules/connectionDesign";
import { estimationTaskRoutes } from "./modules/estimation";
import { RFIRoutes} from "./modules/RFI"

const routes = express.Router();

routes.use("/auth", AuthRoutes);
routes.use("/user", userRouter);
routes.use("/task/workingHours", whRoutes);
routes.use("/employee",EmployeeRoutes)
routes.use("/fabricator",fabricatorRoutes)
routes.use("/department",departmentRoutes)
routes.use("/team", TeamRoutes)
routes.use("/task", taskRouter)
routes.use("/estimation",estimationTaskRoutes)
routes.use("/commnet",CommentRoutes)
routes.use("/mileStone",MileStoneRoutes)
routes.use("/changeOrder",coRouter)
routes.use("/rfq",RFQRoutes)
routes.use("/rfi",RFIRoutes)
routes.use("/project",projectRoutes)
routes.use("/notifications",NotificationRouter)
routes.use("/agent",agentRoutes)
routes.use("/chat",chatRoutes)
routes.use("/client",ClientRoutes)
routes.use("/invoice",invoiceRoutes)
routes.use("/connectionDesign",CDroutes)
routes.use("/connectionDesignerQuota",CDQroutes)

export default routes