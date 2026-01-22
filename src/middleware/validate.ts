import { ZodType, ZodObject } from "zod";
import { AppError } from "../config/utils/AppError";
import { Request, Response, NextFunction } from 'express';

type SchemaConfig = {
  body?: ZodType<any>;
  params?: ZodObject<any, any>;
  query?: ZodObject<any, any>;
};

const validate = (schemas: SchemaConfig) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        console.log("Content-Type:", req.headers['content-type']);
        console.log("Validating request body:", req.body);

        // For multipart requests, req.body might not be fully populated yet
        // or might be undefined if the multipart parsing failed
        if (req.body === undefined && req.headers['content-type']?.includes('multipart/form-data')) {
          // Skip body validation for multipart requests - let multer handle it
          console.log("Skipping body validation for multipart request");
          next();
          return;
        }

        if (req.body === undefined) {
          throw new AppError("Request body is required and must be valid JSON", 400);
        }

        const parsed = schemas.body.safeParse(req.body);
        console.log("Validation result:", parsed)
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
      console.error("Validation error:", err);
      next(err);
    }
  };

export default validate;
