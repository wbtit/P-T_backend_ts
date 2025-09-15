import express from "express";
import { AuthRoutes } from "./modules/user/auth";
import { EmployeeRoutes } from "./modules/user/employee";
import { fabricatorRoutes } from "./modules/fabricator";
import { TeamRoutes } from "./modules/team";
import { taskRouter } from "./modules/tasks";
import {userRouter} from "./modules/user/"
import { whRoutes } from "./modules/workingHours";

const routes = express.Router();

routes.use("/auth", AuthRoutes);
routes.use("/user", userRouter);
routes.use("/task/workingHours", whRoutes);
routes.use("/employee",EmployeeRoutes)
routes.use("/fabricator",fabricatorRoutes)
routes.use("/team", TeamRoutes)
routes.use("/task", taskRouter)

export default routes