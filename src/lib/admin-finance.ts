export type MemberInfo = {
    firstName: string | null;
    lastName: string | null;
    email: string;
};

export type Transaction = {
    id: string;
    date: string;
    description: string;
    subDescription?: string;
    category: string;
    type: "INNTEKT" | "UTGIFT";
    amount: number;
    status: string;
    member?: MemberInfo;
};

export type MemberBalance = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
    membershipType: string;
    balance: number;
};

export type FinanceStats = {
    treasuryBalance: number;
    totalIncome: number;
    totalExpenses: number;
    expectedAnnualIncome: number;
    expectedMembershipIncome: number;
    expectedInvoiceIncome: number;
    transactions: Transaction[];
    memberBalances: MemberBalance[];
};
