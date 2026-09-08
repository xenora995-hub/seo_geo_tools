export interface AiVisibilityResult {
    keyword: string;
    appearsInChatGpt: boolean;
    appearsInPerplexity: boolean;
    appearsInGemini: boolean;
    aiSummary: string;
    recommendation: string;
    checkedAt: string;
}
export declare function checkAiVisibility(tenantId: string): Promise<AiVisibilityResult[]>;
//# sourceMappingURL=chatgpt.d.ts.map