import express from "express";
import { AuthRoutes } from "./modules/user/auth";
import { EmployeeRoutes } from "./modules/user/employee";


const routes = express.Router();

routes.use("/auth",AuthRoutes)
routes.use("/employee",EmployeeRoutes)

export default routes