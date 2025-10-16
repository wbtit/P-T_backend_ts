const rolePermissions = {
STAFF:[],
  VENDOR:[],
  ADMIN:[],
  SALES_MANAGER:[],
  SALES_PERSON:[],
  SYSTEM_ADMIN:[],
  DEPT_MANAGER:[],
  ESTIMATION_HEAD:[],
  ESTIMATOR:[],
  PROJECT_MANAGER:[],
  TEAM_LEAD:[],
  PROJECT_MANAGER_OFFICER:[],
  DEPUTY_MANAGER:[],
  OPERATION_EXECUTIVE:[],
  HUMAN_RESOURCE:[],
  CLIENT:[],
  CLIENT_ADMIN:[],
  CLIENT_PROJECT_COORDINATOR:[],
  CLIENT_GENERAL_CONSTRUCTOR:[]
}

  export const validateIntentForRole = (role: string, intent: string) =>
  rolePermissions[role]?.includes(intent);