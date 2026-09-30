/**
 * Central Verified Business & Branch Knowledge Graph
 * Brand: Bali Phone Repair
 * Branches: Bale Bali, iSmart Canggu, iSmart Teuku Umar
 */
export interface BranchInfo {
    branchCode: string;
    branchName: string;
    relationshipEn: string;
    address: string;
    district: string;
    city: string;
    postalCode: string;
    areaServed: string[];
    phone: string;
    whatsapp: string;
    email: string;
    openingHours: string[];
    openingHoursSpecification: Array<{
        dayOfWeek: string[];
        opens: string;
        closes: string;
    }>;
    googleMapsUrl?: string;
    pageUrl: string;
    isWalkInWorkshop: boolean;
    hasOnSiteVillaService: boolean;
    hasCourierPickup: boolean;
    servicesOffered: string[];
    notesEn: string;
}
export declare const MAIN_BRAND_INFO: {
    name: string;
    legalName: string;
    domain: string;
    website: string;
    mainPhone: string;
    formattedPhone: string;
    email: string;
    headOfficeAddress: string;
    logoUrl: string;
    serviceAreas: string[];
    verifiedBranches: {
        branchCode: string;
        branchName: string;
        relationshipEn: string;
        address: string;
        district: string;
        city: string;
        postalCode: string;
        areaServed: string[];
        phone: string;
        whatsapp: string;
        email: string;
        openingHours: string[];
        openingHoursSpecification: {
            dayOfWeek: string[];
            opens: string;
            closes: string;
        }[];
        googleMapsUrl: string;
        pageUrl: string;
        isWalkInWorkshop: boolean;
        hasOnSiteVillaService: boolean;
        hasCourierPickup: boolean;
        servicesOffered: string[];
        notesEn: string;
    }[];
};
/**
 * Builds standard Schema.org JSON-LD graph connecting parent organization and verified branches
 */
export declare function buildParentAndBranchesSchema(baseUrl?: string): string;
//# sourceMappingURL=business-branches.d.ts.map