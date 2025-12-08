import { JwtPayload } from "jsonwebtoken";
interface UserJwt extends JwtPayload{
    id:string;
    email:string|null;
    username:string;
    role: 'STAFF'|
          'CLIENT'|
          'VENDOR'|
          'ADMIN'|
          'SYSTEM_ADMIN'|
          'CLIENT_ADMIN'|
          'CONNECTION_DESIGNER_ENGINEER'|
          'SALES_MANAGER'|
          'SALES_PERSON'|
          'DEPT_MANAGER'|
          'ESTIMATION_HEAD'|
          'ESTIMATOR'|
          'PROJECT_MANAGER'|
          'TEAM_LEAD'|
          'PROJECT_MANAGER_OFFICER'|
          'DEPUTY_MANAGER'|
          'OPERATION_EXECUTIVE'|
          'HUMAN_RESOURCE'
}
export {UserJwt}