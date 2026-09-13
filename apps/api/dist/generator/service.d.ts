interface GenerateOptions {
    tenantId: string;
    topic?: string;
    keywords?: string[];
    publishDate?: string;
}
export declare function generateAndPublish(options: GenerateOptions): Promise<{
    success: boolean;
    article: {
        content: string;
        cmsPostUrl: string | null;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        title: string;
        excerpt: string;
        keywords: string[];
        imageUrl: string | null;
        imagePrompt: string | null;
        publishedAt: Date | null;
        cmsPostId: string | null;
        errorLog: string | null;
    };
    message?: undefined;
} | {
    success: boolean;
    article: {
        content: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        title: string;
        excerpt: string;
        keywords: string[];
        imageUrl: string | null;
        imagePrompt: string | null;
        publishedAt: Date | null;
        cmsPostId: string | null;
        cmsPostUrl: string | null;
        errorLog: string | null;
    };
    message: string;
}>;
export declare function getDynamicAuthor(topicOrTitle: string): string;
export declare function getArticleUrl(title: string, tenantCmsUrl?: string, cmsPostUrl?: string | null): string;
export declare function generateArticleSchema(title: string, excerpt: string, keywords: string[], publishDate: Date, authorName: string, articleUrl: string, timezone?: string): string;
export declare function generateFaqSchema(contentHtml: string): string;
export declare function generateLocalBusinessSchema(): string;
export declare function publishExistingArticle(articleId: string, customPublishDate?: string | Date | null): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    title: string;
    content: string;
    excerpt: string;
    keywords: string[];
    imageUrl: string | null;
    imagePrompt: string | null;
    status: import(".prisma/client").$Enums.ArticleStatus;
    publishedAt: Date | null;
    cmsPostId: string | null;
    cmsPostUrl: string | null;
    errorLog: string | null;
}>;
export {};
//# sourceMappingURL=service.d.ts.map