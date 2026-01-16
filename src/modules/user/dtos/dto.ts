import { z } from "zod";
export type userRole='STAFF'|
          'CLIENT'|
          'CLIENT_ADMIN'|
          'CLIENT_PROJECT_COORDINATOR'|
          'CLIENT_GENERAL_CONSTRUCTOR'|
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

export const createUserSchema = z.object({
  username: z.string(),
  password: z.string().min(6).optional(),
  email: z.string().nullable().optional(),
  firstName:z.string(),
  middleName:z.string().nullable().optional(),
  lastName:z.string().nullable().optional(),
  phone:z.string(),
  extension:z.string().nullable().optional(),
  landline:z.string().nullable().optional(),
  altLandline:z.string().nullable().optional(),
  altPhone:z.string().nullable().optional(),
  designation:z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  role: z.string(),
  departmentId: z.string().nullable().optional(),
  fabricatorId:z.string().optional(),
  connectionDesignerId:z.string().optional()
});

export const UpdateUserSchema=createUserSchema.partial()

export const FetchUserSchema=z.object({
    id:z.string(),
})




// Export TS types
export type createUserInput = z.infer<typeof createUserSchema>;
export type updateUserInput=z.infer<typeof UpdateUserSchema>;
export type getUserInput=z.infer<typeof FetchUserSchema>
