import express from "express";
import { AuthRoutes } from "./modules/user/auth";
import { EmployeeRoutes } from "./modules/user/employee";
import { fabricatorRoutes } from "./modules/fabricator";


const routes = express.Router();

routes.use("/auth",AuthRoutes)
routes.use("/employee",EmployeeRoutes)
routes.use("/fabricator",fabricatorRoutes)

export default routes