import { Response } from "express";

interface SendResponseParams {
  res: Response;
  statusCode: number;
  success: boolean;
  message: string;
  data?: any;
}

export const sendResponse = ({ res, statusCode, success, message, data }: SendResponseParams) => {
  return res.status(statusCode).json({
    success,
    message,
    ...(data && { data }),
  });
};
