export type EmploymentStatus = "employed" | "self_employed" | "unemployed" | "retired";
export type LoanPurpose = "home" | "auto" | "education" | "business" | "personal" | "debt_consolidation";

export interface CreditInput {
  age: number;
  annualIncome: number;
  monthlyDebt: number;
  loanAmount: number;
  loanTermMonths: number;
  creditScore: number; // 300-850
  creditHistoryYears: number;
  openAccounts: number;
  delinquencies2y: number;
  employment: EmploymentStatus;
  purpose: LoanPurpose;
}

export interface CreditResult {
  pd: number; // probability of default 0-1
  riskScore: number; // 0-100 (higher = safer)
  grade: "A" | "B" | "C" | "D" | "E";
  decision: "Approve" | "Review" | "Decline";
  dti: number;
  ltiMonthly: number;
  estimatedAPR: number;
  monthlyPayment: number;
  factors: { label: string; impact: number; direction: "positive" | "negative" }[];
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function analyzeCredit(i: CreditInput): CreditResult {
  const monthlyIncome = i.annualIncome / 12;
  const dti = monthlyIncome > 0 ? i.monthlyDebt / monthlyIncome : 1;

  // Estimate monthly payment for new loan at provisional 10% APR for ratio calc
  const provisionalRate = 0.10 / 12;
  const provisionalPmt =
    (i.loanAmount * provisionalRate) /
    (1 - Math.pow(1 + provisionalRate, -i.loanTermMonths));
  const ltiMonthly = monthlyIncome > 0 ? provisionalPmt / monthlyIncome : 1;

  const employmentWeight: Record<EmploymentStatus, number> = {
    employed: -0.6,
    self_employed: 0.2,
    retired: -0.1,
    unemployed: 1.2,
  };
  const purposeWeight: Record<LoanPurpose, number> = {
    home: -0.3,
    auto: -0.1,
    education: 0.0,
    business: 0.3,
    debt_consolidation: 0.2,
    personal: 0.4,
  };

  // Logistic model for probability of default
  const z =
    -3.2 +
    (650 - i.creditScore) * 0.012 +
    dti * 2.5 +
    ltiMonthly * 3.0 +
    i.delinquencies2y * 0.6 +
    Math.max(0, 3 - i.creditHistoryYears) * 0.25 +
    Math.max(0, 25 - i.age) * 0.03 +
    employmentWeight[i.employment] +
    purposeWeight[i.purpose] +
    Math.max(0, i.openAccounts - 8) * 0.08;

  const pd = Math.min(0.99, Math.max(0.005, sigmoid(z)));
  const riskScore = Math.round((1 - pd) * 100);

  const grade: CreditResult["grade"] =
    pd < 0.05 ? "A" : pd < 0.12 ? "B" : pd < 0.22 ? "C" : pd < 0.4 ? "D" : "E";
  const decision: CreditResult["decision"] =
    pd < 0.15 ? "Approve" : pd < 0.35 ? "Review" : "Decline";

  // Risk-based APR
  const baseAPR = 0.055;
  const estimatedAPR = baseAPR + pd * 0.45;
  const r = estimatedAPR / 12;
  const monthlyPayment =
    (i.loanAmount * r) / (1 - Math.pow(1 + r, -i.loanTermMonths));

  const factors = [
    {
      label: "Credit score",
      impact: (i.creditScore - 650) * 0.012,
      direction: i.creditScore >= 650 ? "positive" : "negative",
    },
    { label: "Debt-to-income", impact: dti * 2.5, direction: dti < 0.36 ? "positive" : "negative" },
    { label: "Loan-to-income", impact: ltiMonthly * 3.0, direction: ltiMonthly < 0.2 ? "positive" : "negative" },
    { label: "Delinquencies (2y)", impact: i.delinquencies2y * 0.6, direction: i.delinquencies2y === 0 ? "positive" : "negative" },
    { label: "Credit history", impact: Math.max(0, 3 - i.creditHistoryYears) * 0.25, direction: i.creditHistoryYears >= 3 ? "positive" : "negative" },
    { label: "Employment", impact: employmentWeight[i.employment], direction: employmentWeight[i.employment] <= 0 ? "positive" : "negative" },
    { label: "Loan purpose", impact: purposeWeight[i.purpose], direction: purposeWeight[i.purpose] <= 0 ? "positive" : "negative" },
  ].map((f) => ({ ...f, impact: Math.abs(f.impact), direction: f.direction as "positive" | "negative" }))
   .sort((a, b) => b.impact - a.impact);

  return { pd, riskScore, grade, decision, dti, ltiMonthly, estimatedAPR, monthlyPayment, factors };
}

export const SAMPLE_PORTFOLIO: { name: string; input: CreditInput }[] = [
  {
    name: "Prime borrower",
    input: { age: 38, annualIncome: 2400000, monthlyDebt: 25000, loanAmount: 1500000, loanTermMonths: 60, creditScore: 780, creditHistoryYears: 15, openAccounts: 5, delinquencies2y: 0, employment: "employed", purpose: "auto" },
  },
  {
    name: "Near-prime",
    input: { age: 29, annualIncome: 900000, monthlyDebt: 18000, loanAmount: 500000, loanTermMonths: 48, creditScore: 690, creditHistoryYears: 6, openAccounts: 6, delinquencies2y: 0, employment: "employed", purpose: "debt_consolidation" },
  },
  {
    name: "Subprime",
    input: { age: 24, annualIncome: 480000, monthlyDebt: 14000, loanAmount: 300000, loanTermMonths: 36, creditScore: 590, creditHistoryYears: 2, openAccounts: 9, delinquencies2y: 2, employment: "self_employed", purpose: "personal" },
  },
  {
    name: "High risk",
    input: { age: 45, annualIncome: 360000, monthlyDebt: 22000, loanAmount: 600000, loanTermMonths: 60, creditScore: 520, creditHistoryYears: 4, openAccounts: 11, delinquencies2y: 4, employment: "unemployed", purpose: "business" },
  },
];
