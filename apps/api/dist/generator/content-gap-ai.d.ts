import { GoogleGenerativeAI } from '@google/generative-ai';
export interface GapKeyword {
    keyword: string;
    volume: number;
    myRank: number;
    competitors: {
        domain: string;
        rank: number;
    }[];
}
export declare function generateContentGapKeywords(genAI: GoogleGenerativeAI, myDomain: string, niche?: string, location?: string, language?: string, targetKeywords?: string[]): Promise<GapKeyword[]>;
//# sourceMappingURL=content-gap-ai.d.ts.map