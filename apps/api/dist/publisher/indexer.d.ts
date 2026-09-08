/**
 * Meminta Google untuk mengindeks URL baru secara instan
 * @param url URL artikel yang baru dipublikasikan
 * @param serviceAccountJsonString JSON credential dari Google Cloud (harus memiliki akses ke GSC)
 */
export declare function pingGoogleIndexing(url: string, serviceAccountJsonString: string): Promise<import("googleapis").indexing_v3.Schema$PublishUrlNotificationResponse>;
//# sourceMappingURL=indexer.d.ts.map