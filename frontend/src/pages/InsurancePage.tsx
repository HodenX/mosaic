import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { insuranceApi } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import type {
  InsurancePolicy,
  InsurancePolicyCreate,
  InsurancePolicyList,
  InsurancePolicyUpdate,
} from "@/types";

// ---- Constants ----

const TYPE_LABELS: Record<string, string> = {
  critical_illness: "重疾险",
  medical: "医疗险",
  accident: "意外险",
  life: "寿险",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: {
    label: "生效中",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  expired: {
    label: "已过期",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  lapsed: {
    label: "已失效",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// ---- Helpers ----

function getRenewalStatus(nextPaymentDate: string | null): {
  days: number | null;
  level: "overdue" | "urgent" | "warning" | "normal" | "none";
} {
  if (!nextPaymentDate) return { days: null, level: "none" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = new Date(nextPaymentDate);
  const diffDays = Math.ceil(
    (renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return { days: diffDays, level: "overdue" };
  if (diffDays <= 7) return { days: diffDays, level: "urgent" };
  if (diffDays <= 30) return { days: diffDays, level: "warning" };
  return { days: diffDays, level: "normal" };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return dateStr.split("T")[0];
}

function getEmptyCreateForm(): InsurancePolicyCreate {
  return {
    name: "",
    type: "critical_illness",
    insurer: "",
    insured_person: "",
    annual_premium: 0,
    coverage_amount: null,
    coverage_summary: null,
    start_date: null,
    end_date: null,
    payment_years: null,
    next_payment_date: null,
    status: "active",
  };
}

// ---- Policy Form Fields (shared between Add and Edit) ----

function PolicyFormFields({
  form,
  setForm,
}: {
  form: InsurancePolicyCreate | InsurancePolicyUpdate;
  setForm: (form: InsurancePolicyCreate | InsurancePolicyUpdate) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>保险名称 *</Label>
          <Input
            value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="例如 平安福重疾险"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>保险类型</Label>
          <select
            className={SELECT_CLASS}
            value={form.type ?? "critical_illness"}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="critical_illness">重疾险</option>
            <option value="medical">医疗险</option>
            <option value="accident">意外险</option>
            <option value="life">寿险</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>保险公司</Label>
          <Input
            value={form.insurer ?? ""}
            onChange={(e) => setForm({ ...form, insurer: e.target.value })}
            placeholder="例如 平安人寿"
          />
        </div>
        <div className="space-y-2">
          <Label>被保人 *</Label>
          <Input
            value={form.insured_person ?? ""}
            onChange={(e) => setForm({ ...form, insured_person: e.target.value })}
            placeholder="例如 我、老婆、孩子"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>年缴保费</Label>
          <Input
            type="number"
            step="0.01"
            value={form.annual_premium ?? ""}
            onChange={(e) =>
              setForm({ ...form, annual_premium: parseFloat(e.target.value) || 0 })
            }
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label>保额</Label>
          <Input
            type="number"
            step="0.01"
            value={form.coverage_amount ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setForm({
                ...form,
                coverage_amount: v === "" ? null : parseFloat(v) || 0,
              });
            }}
            placeholder="可选"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>保障摘要</Label>
        <textarea
          className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          value={form.coverage_summary ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            setForm({ ...form, coverage_summary: v === "" ? null : v });
          }}
          placeholder="可选，简述保障内容"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>生效日期</Label>
          <Input
            type="date"
            value={form.start_date ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, start_date: v === "" ? null : v });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>终止日期</Label>
          <Input
            type="date"
            value={form.end_date ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, end_date: v === "" ? null : v });
            }}
          />
          <p className="text-xs text-muted-foreground">留空表示终身</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>缴费年限</Label>
          <Input
            type="number"
            value={form.payment_years ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, payment_years: v === "" ? null : parseInt(v) || 0 });
            }}
            placeholder="可选"
          />
        </div>
        <div className="space-y-2">
          <Label>下次续费日期</Label>
          <Input
            type="date"
            value={form.next_payment_date ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, next_payment_date: v === "" ? null : v });
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>状态</Label>
        <select
          className={SELECT_CLASS}
          value={form.status ?? "active"}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="active">生效中</option>
          <option value="expired">已过期</option>
          <option value="lapsed">已失效</option>
        </select>
      </div>
    </>
  );
}

// ---- Add Policy Dialog ----

function AddPolicyDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<InsurancePolicyCreate>(getEmptyCreateForm());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await insuranceApi.create(form);
      setOpen(false);
      setForm(getEmptyCreateForm());
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>添加保单</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加保单</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PolicyFormFields
            form={form}
            setForm={(f) => setForm(f as InsurancePolicyCreate)}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "添加中..." : "确认添加"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Edit Policy Dialog ----

function EditPolicyDialog({
  policy,
  onUpdated,
}: {
  policy: InsurancePolicy;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<InsurancePolicyUpdate>({});

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      setForm({
        name: policy.name,
        type: policy.type,
        insurer: policy.insurer,
        insured_person: policy.insured_person,
        annual_premium: policy.annual_premium,
        coverage_amount: policy.coverage_amount,
        coverage_summary: policy.coverage_summary,
        start_date: policy.start_date,
        end_date: policy.end_date,
        payment_years: policy.payment_years,
        next_payment_date: policy.next_payment_date,
        status: policy.status,
      });
    }
    setOpen(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await insuranceApi.update(policy.id, form);
      setOpen(false);
      onUpdated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          编辑
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑保单 — {policy.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PolicyFormFields
            form={form}
            setForm={(f) => setForm(f as InsurancePolicyUpdate)}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "提交中..." : "确认更新"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Policy Card ----

function PolicyCard({
  policy,
  expanded,
  onToggleExpand,
  onRefresh,
}: {
  policy: InsurancePolicy;
  expanded: boolean;
  onToggleExpand: () => void;
  onRefresh: () => void;
}) {
  const [renewing, setRenewing] = useState(false);

  const statusCfg = STATUS_CONFIG[policy.status] ?? STATUS_CONFIG.active;
  const typeLabel = TYPE_LABELS[policy.type] ?? policy.type;
  const renewal = getRenewalStatus(policy.next_payment_date);

  const renewalColorClass =
    renewal.level === "overdue" || renewal.level === "urgent"
      ? "text-red-600"
      : renewal.level === "warning"
        ? "text-amber-600"
        : "";

  const handleRenew = async () => {
    setRenewing(true);
    try {
      await insuranceApi.renew(policy.id);
      onRefresh();
    } finally {
      setRenewing(false);
    }
  };

  const handleDelete = async () => {
    await insuranceApi.delete(policy.id);
    onRefresh();
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{policy.name}</CardTitle>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}
          >
            {statusCfg.label}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-1.5 text-sm">
        <p className="text-muted-foreground">{policy.insurer || "-"}</p>
        <p className="text-muted-foreground">{typeLabel}</p>
        <div className="flex justify-between">
          <span className="text-muted-foreground">保额</span>
          <span className="font-medium tabular-nums">
            {policy.coverage_amount != null
              ? formatCurrency(policy.coverage_amount, 0)
              : "-"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">年保费</span>
          <span className="font-medium tabular-nums">
            {formatCurrency(policy.annual_premium)}
          </span>
        </div>
        {renewal.level !== "none" && (
          <div className={`flex justify-between ${renewalColorClass}`}>
            <span className={renewal.level === "normal" ? "text-muted-foreground" : ""}>
              续费
            </span>
            <span className="tabular-nums">
              {formatDate(policy.next_payment_date)}
              {renewal.days !== null && ` (${renewal.days}天)`}
            </span>
          </div>
        )}

        {/* Collapsible Detail Section */}
        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">保障摘要：</span>
              <span>{policy.coverage_summary || "暂无保障摘要"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">生效日期</span>
              <span>{formatDate(policy.start_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">终止日期</span>
              <span>{policy.end_date ? formatDate(policy.end_date) : "终身"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">缴费年限</span>
              <span>{policy.payment_years != null ? `${policy.payment_years}年` : "-"}</span>
            </div>
            {policy.next_payment_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">下次续费</span>
                <span>{formatDate(policy.next_payment_date)}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-1 pt-0">
        <Button variant="ghost" size="sm" onClick={onToggleExpand}>
          {expanded ? "收起" : "详情"}
        </Button>
        <EditPolicyDialog policy={policy} onUpdated={onRefresh} />
        {policy.status === "active" && policy.next_payment_date && (
          <Button
            variant="ghost"
            size="sm"
            disabled={renewing}
            onClick={handleRenew}
          >
            {renewing ? "处理中..." : "已续费"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive active:scale-[0.97] transition-transform duration-100"
          onClick={handleDelete}
        >
          删除
        </Button>
      </CardFooter>
    </Card>
  );
}

// ---- Main Page ----

export default function InsurancePage() {
  const [data, setData] = useState<InsurancePolicyList | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await insuranceApi.list();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupedPolicies = useMemo(() => {
    if (!data) return {};
    const groups: Record<string, InsurancePolicy[]> = {};
    for (const p of data.items) {
      if (!groups[p.insured_person]) groups[p.insured_person] = [];
      groups[p.insured_person].push(p);
    }
    return groups;
  }, [data]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Summary Bar */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-sm border-t-2 border-t-primary transition-shadow duration-200 hover:shadow-md">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">
                保单数量
              </p>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {data.summary.active_count}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  份生效 / {data.summary.total_count} 份总计
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-t-2 border-t-primary transition-shadow duration-200 hover:shadow-md">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">
                年缴保费
              </p>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(data.summary.total_annual_premium)}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-t-2 border-t-primary transition-shadow duration-200 hover:shadow-md">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">
                覆盖人数
              </p>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {data.summary.covered_persons}
                <span className="text-sm font-normal text-muted-foreground ml-1">人</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">保单管理</h2>
        <AddPolicyDialog onCreated={fetchData} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, gi) => (
            <div key={gi} className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 2 }).map((_, ci) => (
                  <Card key={ci} className="shadow-sm">
                    <CardContent className="pt-6 space-y-3">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-36" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedPolicies).map(([person, policies]) => (
            <div key={person} className="space-y-3">
              {/* Group Header */}
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span>
                  {person} ({policies.length}份)
                </span>
                <div className="flex-1 border-t" />
              </div>

              {/* Policy Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {policies.map((policy) => (
                  <PolicyCard
                    key={policy.id}
                    policy={policy}
                    expanded={expandedIds.has(policy.id)}
                    onToggleExpand={() => toggleExpand(policy.id)}
                    onRefresh={fetchData}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center text-muted-foreground py-16">
          暂无保单，点击"添加保单"开始
        </div>
      )}
    </div>
  );
}
