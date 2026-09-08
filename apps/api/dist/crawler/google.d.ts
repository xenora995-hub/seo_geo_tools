export interface KeywordRankingResult {
    keyword: string;
    position: number | null;
    page: number | null;
    url: string | null;
    inFirstPage: boolean;
    previousPosition?: number | null;
    delta?: number;
    updatedAt: string;
}
export declare function checkGoogleRankings(tenantId: string): Promise<KeywordRankingResult[]>;
//# sourceMappingURL=google.d.ts.map