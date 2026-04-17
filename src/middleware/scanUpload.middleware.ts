import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { scanFile } from '../utils/virusScan.util';

const QUARANTINE_DIR = '/home/wbtserver/P-T_backend_ts/quarantine';

export const scanUploadMiddleware = async (req: any, res: Response, next: NextFunction) => {
    const files: Express.Multer.File[] = [];
    
    if (req.file) {
        files.push(req.file);
    }
    
    if (req.files) {
        if (Array.isArray(req.files)) {
            files.push(...req.files);
        } else {
            // It's a field object
            Object.values(req.files).forEach((fileArray: any) => {
                files.push(...fileArray);
            });
        }
    }

    if (files.length === 0) {
        return next();
    }

    try {
        for (const file of files) {
            const scanResult = await scanFile(file.path);
            
            if (!scanResult.isClean) {
                const timestamp = new Date().toISOString();
                const filename = file.filename || path.basename(file.path);
                const virusName = scanResult.virusName || 'Unknown';
                const userId = req.user?.id || 'Anonymous';

                console.error(`[${timestamp}] INFECTED FILE DETECTED:
                    Filename: ${filename}
                    Virus: ${virusName}
                    User ID: ${userId}
                    Path: ${file.path}`);

                const quarantinePath = path.join(QUARANTINE_DIR, filename);
                
                try {
                    await fs.rename(file.path, quarantinePath);
                } catch (moveError) {
                    console.error(`Failed to move infected file to quarantine: ${file.path}`, moveError);
                }

                return res.status(422).json({
                    message: 'File rejected: security scan failed'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Error in scanUploadMiddleware:', error);
        res.status(500).json({ message: 'Internal server error during security scan' });
    }
};
