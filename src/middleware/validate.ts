import { ZodSchema, ZodObject } from "zod";
import { AppError } from "../config/utils/AppError";
import { Request, Response, NextFunction } from 'express';

type SchemaConfig = {
  body?: ZodObject<any, any>;
  params?: ZodObject<any, any>;
  query?: ZodObject<any, any>;
};

const validate = (schemas: SchemaConfig) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        console.log("Validating request body:", req.body); // Debugging line
        const parsed = schemas.body.safeParse(req.body);
        if (!parsed.success) throw new AppError(parsed.error.message, 400);
        req.body = parsed.data;
      }

      if (schemas.params) {
        const parsed = schemas.params.safeParse(req.params);
        if (!parsed.success) throw new AppError(parsed.error.message, 400);
        req.params = parsed.data as import('express-serve-static-core').ParamsDictionary;
      }

      if (schemas.query) {
        const parsed = schemas.query.safeParse(req.query);
        if (!parsed.success) throw new AppError(parsed.error.message, 400);
        req.query = parsed.data as any;
      }

      next();
    } catch (err) {
      console.error("Validation error:", err); // Debugging line
      next(err);
    }
  };

export default validate;
