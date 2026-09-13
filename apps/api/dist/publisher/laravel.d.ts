interface PublishOptions {
    tenant: {
        cmsUrl: string;
        cmsApiKey: string;
    };
    article: {
        title: string;
        content: string;
        excerpt: string;
        keywords: string[];
        imageUrl?: string | null;
        author?: string;
    };
    imageUrl?: string | null;
    publishDate?: string | Date | null;
    timezone?: string;
}
export declare function formatPublishDateTo0800(dateInput?: string | Date | null, timezone?: string): string;
export declare function publishToLaravel(options: PublishOptions): Promise<{
    id: string;
    url: any;
}>;
export {};
//# sourceMappingURL=laravel.d.ts.map