import z from 'zod';

export const branchSchema = z.object({
  fabricatorId: z.string().uuid(),
  name: z.string().min(2).max(100),
  address: z.string().min(2).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  country: z.string().min(2).max(100),
  zipCode: z.string().min(2).max(20),
  phone: z.string().min(2).max(20).optional(),
  email: z.string().max(150).optional(),
  isHeadquarters: z.boolean().default(false),
});
export const updateBranchSchema = branchSchema.partial()

export type CreateBranchInput = z.infer<typeof branchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema> & {id:string};
export type DeleteBranchInput={id:string}
