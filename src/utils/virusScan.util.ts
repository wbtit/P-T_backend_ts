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

export const scanFile = async (filePath: string): Promise<{ isClean: boolean; virusName?: string }> => {
    try {
        const clamscan = await getClamscan();
        const { isInfected, virus } = await clamscan.scanFile(filePath);

        return {
            isClean: !isInfected,
            virusName: virus || undefined
        };
    } catch (error) {
        console.error('Error during virus scan:', error);
        // If scanning fails, we might want to fail-closed (reject the file) or fail-open.
        // Given the requirement "If infected ... return HTTP 422", I'll treat errors as "infected" or at least "not clean".
        return { isClean: false, virusName: 'Scan Error' };
    }
};
