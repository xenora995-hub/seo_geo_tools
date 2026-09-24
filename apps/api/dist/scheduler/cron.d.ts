export declare function initScheduler(): Promise<void>;
export declare function checkMissedSchedules(): Promise<void>;
export declare function getDateStringInTimezone(d: Date, tz?: string): string;
export declare function runScheduleJob(scheduleId: string, options?: {
    force?: boolean;
}): Promise<{
    success: boolean;
    message: string;
    article?: any;
}>;
export declare function registerCron(schedule: {
    id: string;
    cronExpr: string;
    tenantId: string;
    topic?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
}): Promise<void>;
export declare function unregisterCron(scheduleId: string): void;
//# sourceMappingURL=cron.d.ts.map