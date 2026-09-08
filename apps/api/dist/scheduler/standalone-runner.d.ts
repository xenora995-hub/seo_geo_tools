import 'dotenv/config';
interface RunnerOptions {
    force?: boolean;
    scheduleId?: string;
}
export declare function runStandaloneSchedules(options?: RunnerOptions): Promise<{
    success: boolean;
    message: string;
    total?: undefined;
    details?: undefined;
} | {
    success: boolean;
    total: number;
    details: ({
        id: string;
        name: string;
        tenant: string;
        skipped: boolean;
        reason: string;
        success?: undefined;
        message?: undefined;
    } | {
        success: boolean;
        message: string;
        article?: any;
        id: string;
        name: string;
        tenant: string;
        skipped?: undefined;
        reason?: undefined;
    } | {
        id: string;
        name: string;
        tenant: string;
        success: boolean;
        message: any;
        skipped?: undefined;
        reason?: undefined;
    })[];
    message?: undefined;
}>;
export {};
//# sourceMappingURL=standalone-runner.d.ts.map