import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { scanFile } from '../utils/virusScan.util';
import { UPLOAD_BASE_DIR } from '../utils/fileUtil';

// Was hardcoded to '/home/wbtserver/P-T_backend_ts/quarantine' -- a path on
// a different host from a prior migration (same class of bug as
// UPLOAD_BASE_DIR/PUBLIC_DIR before those were fixed). Derived from
// UPLOAD_BASE_DIR instead, so it moves with the real upload root on
// whichever host this runs on; still overridable via env for a real prod
// deployment that wants quarantine somewhere else entirely.
const QUARANTINE_DIR = process.env.QUARANTINE_DIR || path.join(path.dirname(UPLOAD_BASE_DIR), 'quarantine');

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

            if (scanResult.scanError) {
                // Scanner infrastructure failed (e.g. ClamAV not
                // installed/running) -- NOT a virus detection. scanFile()
                // already fails open for this case; just make the real
                // problem loudly visible here too, at the point a real
                // upload actually went through unscanned.
                console.error(
                    `[${new Date().toISOString()}] Virus scan unavailable -- file allowed through UNSCANNED: ${file.filename || path.basename(file.path)} (${scanResult.scanError})`
                );
            }

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
                    await fs.mkdir(QUARANTINE_DIR, { recursive: true });
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
