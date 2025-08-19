import { Router,Request,Response } from "express";
import prisma from "../database/client";

const router = Router()

router.get("/",async(req:Request,res:Response)=>{
    const startTime =Date.now();
    try {
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - startTime;

        res.status(200).json({
        status: "ok",
        database: "connected",
        latency: `${latency}ms`,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
    } catch (error) {
        console.error("Database connection failed:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
      error: (error as Error).message,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
    }
})

export default router;