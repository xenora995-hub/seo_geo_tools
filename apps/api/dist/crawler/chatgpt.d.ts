export type VisibilityStatus = 'not_checked' | 'mentioned' | 'cited' | 'not_found_in_run' | 'error';
export interface AiVisibilityReportItem {
    id?: string;
    query: string;
    provider: string;
    model: string;
    status: VisibilityStatus;
    brandMentioned: boolean;
    domainCited: boolean;
    domainInSources: boolean;
    citationUrls: string[];
    responseText: string;
    evidenceNotes?: string | null;
    searchSources?: any;
    errorMessage?: string | null;
    isLegacySimulation: boolean;
    testedAt: string;
}
/**
 * Normalizes hostname for reliable domain comparison
 */
export declare function normalizeHostname(urlOrHost: string): string;
/**
 * Checks whether candidate URL or citation belongs to the target domain
 */
export declare function isDomainMatch(targetDomain: string, candidateUrl: string): boolean;
/**
 * Checks whether brand or any of its verified branch names are mentioned in the text
 */
export declare function checkBrandMentions(text: string, brandName: string, branches?: string[]): boolean;
/**
 * Runs an honest, unbiased AI discovery query evaluation.
 * Note: Discovery prompts NEVER inject the target brand name or domain.
 * They test real organic customer queries.
 */
export declare function runAiDiscoveryTest(options: {
    tenantId: string;
    query: string;
    provider?: 'GEMINI_SEARCH_GROUNDING' | 'OPENAI_WEB_SEARCH';
}): Promise<AiVisibilityReportItem>;
/**
 * Retrieves AI visibility history for tenant without data fabrication
 */
export declare function getAiVisibilityHistory(tenantId: string): Promise<AiVisibilityReportItem[]>;
export interface LegacyAiVisibilityCompat {
    keyword: string;
    appearsInChatGpt: boolean;
    appearsInPerplexity: boolean;
    appearsInGemini: boolean;
    aiSummary: string;
    recommendation: string;
    checkedAt: string;
}
/**
 * Backwards compatibility helper returning real test runs without fake data
 */
export declare function checkAiVisibility(tenantId: string): Promise<LegacyAiVisibilityCompat[]>;
//# sourceMappingURL=chatgpt.d.ts.map