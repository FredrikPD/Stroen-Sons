export type AdminDashboardData = {
    firstName: string | null;
    role?: string;
    userRole?: any;
    memberCount: number;
    unpaidCount?: number;
    treasuryBalance: number;
    nextEvent: null | {
        id: string;
        title: string;
        startAt: string;
        coverImage?: string | null;
    };
};
