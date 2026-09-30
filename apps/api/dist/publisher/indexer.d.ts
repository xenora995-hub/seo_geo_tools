export interface IndexResult {
    engine: string;
    success: boolean;
    status?: number;
    message?: string;
}
/**
 * Pushes URLs to Microsoft Bing and IndexNow protocol (used by ChatGPT Search & Yandex)
 */
export declare function pingIndexNow(params: {
    host: string;
    urlList: string[];
    key?: string;
}): Promise<IndexResult[]>;
/**
 * Meminta Google untuk mengindeks URL baru secara instan
 * @param url URL artikel yang baru dipublikasikan
 * @param serviceAccountJsonString JSON credential dari Google Cloud (harus memiliki akses ke GSC)
 */
export declare function pingGoogleIndexing(url: string, serviceAccountJsonString: string): Promise<import("googleapis").indexing_v3.Schema$PublishUrlNotificationResponse>;
/**
 * Multi-Engine Automated Pinger (IndexNow + Google)
 */
export declare function pingAllEngines(params: {
    urls: string[];
    host: string;
    googleServiceAccountJson?: string | null;
}): Promise<IndexResult[]>;
//# sourceMappingURL=indexer.d.ts.map