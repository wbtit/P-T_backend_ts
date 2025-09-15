import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { WHService } from "../services";
import { Request,Response } from "express";

const whService = new WHService();
export class WHController {
    async handleStartTask(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { id } = req.user;
        const { id: taskId } = req.params;
        if (!id || !taskId) return res.status(404).json({ message: 'User or task not found' });
        const findData = { user_id: id, task_id: taskId };
        const createData = { user_id: id, task_id: taskId, type: req.body.type };
        const wh = await whService.startTask(findData, createData);
        res.status(201).json({
            status: 'success',
            data: wh,
        });
    }
    async handlePauseTask(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { id } = req.user;
        const { id: taskId } = req.params;
        const { whId } = req.body;
        if (!id || !taskId || !whId) return res.status(404).json({ message: 'User, task or working hours not found' });
        const findData = { user_id: id, task_id: taskId };
        const updateData = { id: whId, duration_seconds: req.body.duration_seconds };
        const wh = await whService.pauseTask(findData, updateData);
        res.status(200).json({
            status: 'success',
            data: wh,
        });
    }
    async handleResumeTask(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { id } = req.user;
        const { id: taskId } = req.params;
        const { whId } = req.body;
        if (!id || !taskId || !whId) return res.status(404).json({ message: 'User, task or working hours not found' });
        const findData = { user_id: id, task_id: taskId };
        const createData = { user_id: id, task_id: taskId, type: req.body.type };
        const wh = await whService.resumeTask(findData, createData);
        res.status(200).json({
            status: 'success',
            data: wh,
        });
    }
    async handleEndTask(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { id } = req.user;
        const { id: taskId } = req.params;
        if (!id || !taskId) return res.status(404).json({ message: 'User or task not found' });
        const findData = { user_id: id, task_id: taskId };
        const updateData = { id: req.body.whId, duration_seconds: req.body.duration_seconds };
        const wh = await whService.endTask(findData, updateData);
        res.status(200).json({
            status: 'success',
            data: wh,
        });
    }
    async handleReworkStartTask(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { id } = req.user;
        const { id: taskId } = req.params;
        if (!id || !taskId) return res.status(404).json({ message: 'User or task not found' });
        const findData = { user_id: id, task_id: taskId };
        const createData = { user_id: id, task_id: taskId, type: req.body.type };
        const wh = await whService.startRework(findData, createData);
        res.status(201).json({
            status: 'success',
            data: wh,
        });
    }
    async handleReworkEndTask(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { id } = req.user;
        const { id: taskId } = req.params;
        if (!id || !taskId) return res.status(404).json({ message: 'User or task not found' });
        const findData = { user_id: id, task_id: taskId };
        const updateData = { id: req.body.whId, duration_seconds: req.body.duration_seconds };
        const wh = await whService.endTask(findData, updateData);
        res.status(200).json({
            status: 'success',
            data: wh,
        });
    }
    async handleGetTaskSummary(req:AuthenticateRequest,res:Response){
        if (!req.user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { id } = req.user;
        const { id: taskId } = req.params;
        if (!id || !taskId) return res.status(404).json({ message: 'User or task not found' });
        const findData = { user_id: id, task_id: taskId };
        const wh = await whService.getTaskSummary(findData);
        res.status(200).json({
            status: 'success',
            data: wh,
        });
    }
}