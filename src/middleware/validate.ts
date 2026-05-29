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
    if (schemas.body && (req.body === undefined || req.body === null)) {
      return res.status(400).json({ error: "Request body could not be parsed" });
    }

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
