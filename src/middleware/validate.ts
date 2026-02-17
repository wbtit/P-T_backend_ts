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
      console.log("[Validation] Incoming request", {
        method: req.method,
        path: req.originalUrl,
        contentType: req.headers["content-type"],
        body: req.body,
        params: req.params,
        query: req.query,
      });

      if (schemas.body) {
        // For multipart requests, req.body might not be fully populated yet
        // or might be undefined if the multipart parsing failed
        if (req.body === undefined && req.headers['content-type']?.includes('multipart/form-data')) {
          // Skip body validation for multipart requests - let multer handle it
          next();
          return;
        }

        if (req.body === undefined) {
          throw new AppError("Request body is required and must be valid JSON", 400);
        }

        const parsed = schemas.body.safeParse(req.body);
        if (!parsed.success) {
          console.error("[Validation][Body] Failed", {
            path: req.originalUrl,
            errors: parsed.error.issues,
            receivedBody: req.body,
          });
          throw new AppError(parsed.error.message, 400);
        }
        req.body = parsed.data;
      }

      if (schemas.params) {
        const parsed = schemas.params.safeParse(req.params);
        if (!parsed.success) {
          console.error("[Validation][Params] Failed", {
            path: req.originalUrl,
            errors: parsed.error.issues,
            receivedParams: req.params,
          });
          throw new AppError(parsed.error.message, 400);
        }
        req.params = parsed.data as import('express-serve-static-core').ParamsDictionary;
      }

      if (schemas.query) {
        const parsed = schemas.query.safeParse(req.query);
        if (!parsed.success) {
          console.error("[Validation][Query] Failed", {
            path: req.originalUrl,
            errors: parsed.error.issues,
            receivedQuery: req.query,
          });
          throw new AppError(parsed.error.message, 400);
        }
        req.query = parsed.data as any;
      }

      next();
    } catch (err) {
      next(err);
    }
  };

export default validate;
