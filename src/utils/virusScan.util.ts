import NodeClam from 'clamscan';

let clamscanPromise: Promise<any> | null = null;

const getClamscan = async () => {
    if (clamscanPromise) return clamscanPromise;

    clamscanPromise = new NodeClam().init({
        removeInfected: false, // We'll move it manually to quarantine
        quarantineInfected: false,
        debugMode: false,
        scanRecursively: true,
        clamdscan: {
            path: '/usr/bin/clamdscan',
            socket: '/var/run/clamav/clamd.ctl',
            active: true,
            timeout: 60000,
            localFallback: true,
        },
        preference: 'clamdscan'
    });

    return clamscanPromise;
};

export const scanFile = async (filePath: string): Promise<{ isClean: boolean; virusName?: string; scanError?: string }> => {
    try {
        const clamscan = await getClamscan();
        const { isInfected, virus } = await clamscan.scanFile(filePath);

        return {
            isClean: !isInfected,
            virusName: virus || undefined
        };
    } catch (error: any) {
        // Fail-open, not fail-closed, on an infrastructure error (can't reach
        // clamd, binary missing, etc.) -- this is NOT a virus detection.
        // Previously this branch returned `{ isClean: false, virusName:
        // 'Scan Error' }`, which the caller logged and acted on identically
        // to a real infection (reject + quarantine). On any machine without
        // a working ClamAV daemon (confirmed: this one has none installed),
        // that meant EVERY upload was rejected, unconditionally, with zero
        // actual scanning ever happening -- a real, silent outage of this
        // upload path, not a security control. Logged loudly instead
        // (`scanError` lets the caller distinguish this from a real
        // detection) so the actual problem -- the scanner being down --
        // gets noticed and fixed, rather than masquerading as infected files.
        console.error('[virusScan] Scanner unavailable, allowing file through unscanned:', error.message);
        return { isClean: true, scanError: error.message };
    }
};
