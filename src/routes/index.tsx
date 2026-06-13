import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { Info, ArrowLeft, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  analyzeCredit, SAMPLE_PORTFOLIO,
  type CreditInput, type EmploymentStatus, type LoanPurpose,
} from "@/lib/credit-risk";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Credit Risk Analysis — Loan Underwriting Dashboard" },
      { name: "description", content: "Estimate probability of default, risk grade, and risk-based pricing for loan applicants in INR." },
      { property: "og:title", content: "Credit Risk Analysis Dashboard" },
      { property: "og:description", content: "Interactive credit risk scorecard with PD, DTI, and risk-based APR in INR." },
    ],
  }),
  component: Dashboard,
});

const DEFAULT_INPUT: CreditInput = {
  age: 32, annualIncome: 1200000, monthlyDebt: 15000, loanAmount: 800000,
  loanTermMonths: 60, creditScore: 710, creditHistoryYears: 8,
  openAccounts: 5, delinquencies2y: 0, employment: "employed", purpose: "auto",
};

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

function InfoTip({ text }: { text: string }) {
  return (
    <UITooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex text-muted-foreground hover:text-foreground" aria-label="More info">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">{text}</TooltipContent>
    </UITooltip>
  );
}

function Dashboard() {
  const [input, setInput] = useState<CreditInput>(DEFAULT_INPUT);
  const [submitted, setSubmitted] = useState(false);
  const result = useMemo(() => analyzeCredit(input), [input]);

  const set = <K extends keyof CreditInput>(k: K, v: CreditInput[K]) =>
    setInput((p) => ({ ...p, [k]: v }));

  const gradeColor: Record<string, string> = {
    A: "bg-success text-success-foreground",
    B: "bg-success/80 text-success-foreground",
    C: "bg-warning text-warning-foreground",
    D: "bg-orange-500 text-white",
    E: "bg-destructive text-destructive-foreground",
  };
  const decisionColor: Record<string, string> = {
    Approve: "bg-success text-success-foreground",
    Review: "bg-warning text-warning-foreground",
    Decline: "bg-destructive text-destructive-foreground",
  };

  const gradeMeaning: Record<string, string> = {
    A: "Excellent credit quality. Very low likelihood of default — eligible for the best interest rates.",
    B: "Good credit quality. Low default risk; standard pricing applies.",
    C: "Moderate risk. Approval possible but with elevated interest rates and tighter terms.",
    D: "High risk. Manual review required; usually needs collateral or a co-signer.",
    E: "Very high risk. Default is highly likely — loan typically declined.",
  };
  const decisionMeaning: Record<string, string> = {
    Approve: "The applicant meets underwriting thresholds and can be auto-approved at the offered APR.",
    Review: "Borderline applicant — requires a human underwriter to verify documents and assess mitigants.",
    Decline: "Risk metrics exceed acceptable thresholds. The loan should not be issued as proposed.",
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/60 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Credit Risk Analysis</h1>
              <p className="text-sm text-muted-foreground">Underwriting & probability-of-default scorecard · INR</p>
            </div>
            <Badge variant="outline" className="font-mono text-xs">v1.0 · Logistic Scorecard</Badge>
          </div>
        </header>

        {!submitted ? (
          <InputView
            input={input}
            set={set}
            onAnalyze={() => setSubmitted(true)}
            onReset={() => setInput(DEFAULT_INPUT)}
            onLoadSample={(i) => setInput(i)}
          />
        ) : (
          <ResultsView
            input={input}
            result={result}
            gradeColor={gradeColor}
            decisionColor={decisionColor}
            gradeMeaning={gradeMeaning}
            decisionMeaning={decisionMeaning}
            onEdit={() => setSubmitted(false)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

function InputView({
  input, set, onAnalyze, onReset, onLoadSample,
}: {
  input: CreditInput;
  set: <K extends keyof CreditInput>(k: K, v: CreditInput[K]) => void;
  onAnalyze: () => void;
  onReset: () => void;
  onLoadSample: (i: CreditInput) => void;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" /> Applicant Profile
          </CardTitle>
          <CardDescription>
            Enter the applicant's financial details. All amounts are in Indian Rupees (₹).
            We use these inputs in a logistic regression-style scorecard to estimate the probability of default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Age" tip="Borrower age in years. Very young applicants have thinner credit files and slightly higher default rates.">
              <Input type="number" value={input.age} onChange={(e) => set("age", +e.target.value)} />
            </Field>
            <Field label="Annual income (₹)" tip="Gross yearly income before tax. Used to compute affordability ratios like DTI and LTI.">
              <Input type="number" value={input.annualIncome} onChange={(e) => set("annualIncome", +e.target.value)} />
            </Field>
            <Field label="Monthly debt (₹)" tip="Total existing monthly EMI obligations (other loans, credit-card minimums). Used to compute Debt-to-Income.">
              <Input type="number" value={input.monthlyDebt} onChange={(e) => set("monthlyDebt", +e.target.value)} />
            </Field>
            <Field label="Loan amount (₹)" tip="Requested principal for the new loan. Higher amounts relative to income increase risk.">
              <Input type="number" value={input.loanAmount} onChange={(e) => set("loanAmount", +e.target.value)} />
            </Field>
            <Field label="Term (months)" tip="Repayment tenure. Longer terms reduce monthly EMI but raise total interest paid.">
              <Select value={String(input.loanTermMonths)} onValueChange={(v) => set("loanTermMonths", +v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[12, 24, 36, 48, 60, 72, 84].map((t) => (
                    <SelectItem key={t} value={String(t)}>{t} mo</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Open accounts" tip="Number of active credit lines (cards + loans). Too many open accounts can signal credit-hungry behaviour.">
              <Input type="number" value={input.openAccounts} onChange={(e) => set("openAccounts", +e.target.value)} />
            </Field>
          </div>

          <Separator />

          <div className="space-y-4">
            <SliderField
              label="Credit score (CIBIL-style 300–850)"
              tip="Bureau score capturing past repayment behaviour. 750+ is considered very good in India."
              value={input.creditScore} min={300} max={850} step={1}
              onChange={(v) => set("creditScore", v)}
            />
            <SliderField
              label="Credit history (years)"
              tip="Length of credit history. Thin files (<3y) carry higher uncertainty."
              value={input.creditHistoryYears} min={0} max={40} step={1}
              onChange={(v) => set("creditHistoryYears", v)}
            />
            <SliderField
              label="Delinquencies (last 2 years)"
              tip="Count of payments 30+ days late in the past 24 months. Each delinquency materially raises PD."
              value={input.delinquencies2y} min={0} max={10} step={1}
              onChange={(v) => set("delinquencies2y", v)}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Employment" tip="Salaried applicants typically show the lowest default risk; unemployed the highest.">
              <Select value={input.employment} onValueChange={(v) => set("employment", v as EmploymentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Salaried</SelectItem>
                  <SelectItem value="self_employed">Self-employed</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Loan purpose" tip="Secured purposes (home, auto) historically default less than unsecured personal or business loans.">
              <Select value={input.purpose} onValueChange={(v) => set("purpose", v as LoanPurpose)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="debt_consolidation">Debt consolidation</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Quick-load a sample applicant</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PORTFOLIO.map((s) => (
                <Button key={s.name} variant="outline" size="sm" onClick={() => onLoadSample(s.input)}>
                  {s.name}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={onReset}>Reset</Button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="lg" onClick={onAnalyze}>Analyze risk →</Button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Educational scorecard using a logistic regression-style model. Not financial advice.
      </p>
    </main>
  );
}

function ResultsView({
  input, result, gradeColor, decisionColor, gradeMeaning, decisionMeaning, onEdit,
}: {
  input: CreditInput;
  result: ReturnType<typeof analyzeCredit>;
  gradeColor: Record<string, string>;
  decisionColor: Record<string, string>;
  gradeMeaning: Record<string, string>;
  decisionMeaning: Record<string, string>;
  onEdit: () => void;
}) {
  const gaugeData = [{ name: "score", value: result.riskScore, fill: "var(--color-primary)" }];
  const factorData = result.factors.map((f) => ({
    name: f.label, impact: Number(f.impact.toFixed(2)), direction: f.direction,
  }));
  const portfolio = SAMPLE_PORTFOLIO.map((p) => ({ ...p, res: analyzeCredit(p.input) }));

  const narrative =
    result.decision === "Approve"
      ? `This applicant scores ${result.riskScore}/100 with an estimated ${fmtPct(result.pd)} probability of default — well within acceptable bounds. They can be auto-approved at approximately ${fmtPct(result.estimatedAPR, 2)} APR.`
      : result.decision === "Review"
      ? `This applicant scores ${result.riskScore}/100 with an estimated ${fmtPct(result.pd)} probability of default. The profile sits in the grey zone — recommend a manual underwriter review, additional documentation, or risk-based repricing.`
      : `This applicant scores ${result.riskScore}/100 with an estimated ${fmtPct(result.pd)} probability of default — above the lender's tolerance. Approval is not advised without collateral, a co-signer, or a materially reduced loan amount.`;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Edit inputs
        </Button>
        <div className="text-xs text-muted-foreground">
          Analyzing: ₹{input.annualIncome.toLocaleString("en-IN")}/yr income · ₹{input.loanAmount.toLocaleString("en-IN")} loan · {input.loanTermMonths} mo
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-base">
              Risk score <InfoTip text="A 0–100 indicator where higher is safer. Computed as (1 − probability of default) × 100." />
            </CardTitle>
            <CardDescription>Higher = safer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-44">
              <ResponsiveContainer>
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={gaugeData} startAngle={210} endAngle={-30}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background dataKey="value" cornerRadius={12} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-semibold tabular-nums">{result.riskScore}</div>
                <div className="text-xs text-muted-foreground">out of 100</div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge className={gradeColor[result.grade]}>Grade {result.grade}</Badge>
              <InfoTip text={gradeMeaning[result.grade]} />
              <Badge className={decisionColor[result.decision]}>{result.decision}</Badge>
              <InfoTip text={decisionMeaning[result.decision]} />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Key metrics</CardTitle>
            <CardDescription>Derived ratios and risk-based pricing (INR)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Metric label="Prob. of default" value={fmtPct(result.pd)} tip="Model-estimated chance the borrower will default within the loan tenure." tone={result.pd < 0.15 ? "good" : result.pd < 0.35 ? "warn" : "bad"} />
              <Metric label="Debt-to-income" value={fmtPct(result.dti)} tip="Existing monthly EMI divided by monthly income. Lenders usually want this below 40%." tone={result.dti < 0.36 ? "good" : result.dti < 0.5 ? "warn" : "bad"} />
              <Metric label="Estimated APR" value={fmtPct(result.estimatedAPR, 2)} tip="Risk-based annual interest rate. Higher PD borrowers are priced higher to compensate the lender." />
              <Metric label="Monthly EMI" value={fmtINR(result.monthlyPayment)} tip="Equated monthly instalment for the requested loan at the estimated APR." />
              <Metric label="Loan-to-income (mo)" value={fmtPct(result.ltiMonthly)} tip="New EMI as a share of monthly income. >20% is considered stretched." />
              <Metric label="Loan amount" value={fmtINR(input.loanAmount)} />
              <Metric label="Total interest" value={fmtINR(result.monthlyPayment * input.loanTermMonths - input.loanAmount)} tip="Total interest paid over the full tenure (EMI × months − principal)." />
              <Metric label="Term" value={`${input.loanTermMonths} mo`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What this analysis means</CardTitle>
          <CardDescription>Plain-language interpretation of the scorecard output.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>{narrative}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grade {result.grade}</div>
              <div className="text-sm">{gradeMeaning[result.grade]}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decision: {result.decision}</div>
              <div className="text-sm">{decisionMeaning[result.decision]}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            Risk factor contribution
            <InfoTip text="Each bar shows how strongly that attribute pushed the probability of default up or down. Green = reduces risk, Red = increases risk." />
          </CardTitle>
          <CardDescription>Magnitude of each factor's effect on the default probability.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={factorData} layout="vertical" margin={{ left: 24, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis type="category" dataKey="name" width={140} stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                  formatter={(v: number) => v.toFixed(2)}
                />
                <Bar dataKey="impact" radius={[0, 6, 6, 0]}>
                  {factorData.map((f, i) => (
                    <Cell key={i} fill={f.direction === "positive" ? "var(--color-success)" : "var(--color-destructive)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Reduces risk</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Increases risk</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            Sample portfolio benchmark
            <InfoTip text="How four representative applicants score on the same model — useful to see where this applicant sits on the risk spectrum." />
          </CardTitle>
          <CardDescription>Compare this applicant against typical risk tiers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4">Applicant</th>
                  <th className="py-2 pr-4">Credit</th>
                  <th className="py-2 pr-4">PD</th>
                  <th className="py-2 pr-4">DTI</th>
                  <th className="py-2 pr-4">APR</th>
                  <th className="py-2 pr-4">Grade</th>
                  <th className="py-2">Decision</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((p) => (
                  <tr key={p.name} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{p.name}</td>
                    <td className="py-3 pr-4 tabular-nums">{p.input.creditScore}</td>
                    <td className="py-3 pr-4 tabular-nums">{fmtPct(p.res.pd)}</td>
                    <td className="py-3 pr-4 tabular-nums">{fmtPct(p.res.dti)}</td>
                    <td className="py-3 pr-4 tabular-nums">{fmtPct(p.res.estimatedAPR, 2)}</td>
                    <td className="py-3 pr-4"><Badge className={gradeColor[p.res.grade]}>{p.res.grade}</Badge></td>
                    <td className="py-3"><Badge variant="outline" className={decisionColor[p.res.decision]}>{p.res.decision}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Educational scorecard using a logistic regression-style model. Not financial advice.
      </p>
    </main>
  );
}

function Field({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        {tip && <InfoTip text={tip} />}
      </div>
      {children}
    </div>
  );
}

function SliderField({ label, tip, value, min, max, step, onChange }: {
  label: string; tip?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
          {tip && <InfoTip text={tip} />}
        </div>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function Metric({ label, value, tip, tone }: { label: string; value: string; tip?: string; tone?: "good" | "warn" | "bad" }) {
  const toneClass = tone === "good" ? "text-success" : tone === "warn" ? "text-warning" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        {tip && <InfoTip text={tip} />}
      </div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}
