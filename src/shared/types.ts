import { JwtPayload } from "jsonwebtoken";
interface UserJwt extends JwtPayload{
    id:string;
    email:string|null;
    username:string;
    connectionDesignerId?: string | null;
    departmentId?: string | null;
    role: 'STAFF'|
           'CLIENT'|
           'CLIENT_ESTIMATOR'|
           'VENDOR'|
           'VENDOR_ADMIN'|
          'ADMIN'|
          'SYSTEM_ADMIN'|
          'CLIENT_ADMIN'|
          'CLIENT_ACCOUNTANT'|
          'CLIENT_PROJECT_COORDINATOR'|
          'CLIENT_GENERAL_CONSTRUCTOR'|
          'CONNECTION_DESIGNER_ADMIN'|
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
