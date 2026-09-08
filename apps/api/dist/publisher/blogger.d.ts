import { Tenant, Article } from '@prisma/client';
interface PublishBloggerParams {
    tenant: Tenant;
    article: Article;
    imageUrl?: string | null;
}
export declare function publishToBlogger({ tenant, article, imageUrl }: PublishBloggerParams): Promise<{
    id: string;
    url: string;
}>;
export {};
//# sourceMappingURL=blogger.d.ts.map