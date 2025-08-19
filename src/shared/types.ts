import { JwtPayload } from "jsonwebtoken";
interface UserJwt extends JwtPayload{
    id:string;
    email:string|null;
    username:string;
    role: 'STAFF'|
          'CLIENT'|
          'VENDOR'|
          'ADMIN'|
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