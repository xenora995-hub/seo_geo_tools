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
    publishDate?: string;
}
export declare function publishToWordPress(options: PublishOptions): Promise<{
    id: string;
    url: any;
}>;
export {};
//# sourceMappingURL=wordpress.d.ts.map