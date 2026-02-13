import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { insuranceApi } from "@/services/api";
import { cn, formatCurrency } from "@/lib/utils";
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
    className: "bg-primary/10 text-primary",
  },
  expired: {
    label: "已过期",
    className: "bg-muted text-muted-foreground",
  },
  lapsed: {
    label: "已失效",
    className: "bg-destructive/10 text-destructive",
  },
};

const INSURERS = [
  "中国人寿",
  "中国平安人寿",
  "太平洋人寿",
  "新华人寿",
  "泰康人寿",
  "中国太平人寿",
  "友邦保险",
  "人保寿险",
  "阳光人寿",
  "华夏人寿",
  "百年人寿",
  "信泰人寿",
  "弘康人寿",
  "招商信诺",
  "中英人寿",
  "中意人寿",
  "中荷人寿",
  "同方全球人寿",
  "复星联合健康",
  "昆仑健康",
  "和谐健康",
  "瑞泰人寿",
  "国联人寿",
  "长城人寿",
  "众安保险",
  "京东安联",
  "平安健康",
  "平安财险",
  "人保财险",
  "太平洋财险",
];

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
    policy_number: null,
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

// ---- Insurer Combobox ----

function InsurerCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9 px-3"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value || "选择或输入保险公司"}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder="搜索保险公司..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.trim() ? (
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(search.trim());
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  使用「{search.trim()}」
                </button>
              ) : (
                "未找到匹配项"
              )}
            </CommandEmpty>
            <CommandGroup>
              {INSURERS.map((insurer) => (
                <CommandItem
                  key={insurer}
                  value={insurer}
                  onSelect={(v) => {
                    onChange(v);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  {insurer}
                  <CheckIcon
                    className={cn(
                      "ml-auto size-4",
                      value === insurer ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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
          <Select
            value={form.type ?? "critical_illness"}
            onValueChange={(v) => setForm({ ...form, type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical_illness">重疾险</SelectItem>
              <SelectItem value="medical">医疗险</SelectItem>
              <SelectItem value="accident">意外险</SelectItem>
              <SelectItem value="life">寿险</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>保险公司</Label>
          <InsurerCombobox
            value={form.insurer ?? ""}
            onChange={(v) => setForm({ ...form, insurer: v })}
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

      <div className="space-y-2">
        <Label>保单编号</Label>
        <Input
          value={form.policy_number ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            setForm({ ...form, policy_number: v === "" ? null : v });
          }}
          placeholder="可选，保单合同编号"
        />
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
        <Textarea
          value={form.coverage_summary ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            setForm({ ...form, coverage_summary: v === "" ? null : v });
          }}
          placeholder="可选，简述保障内容"
          rows={2}
          className="resize-none min-h-[60px]"
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
          <p className="text-xs text-muted-foreground">可选</p>
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
          <p className="text-xs text-muted-foreground">可选，留空表示保终身</p>
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
          <p className="text-xs text-muted-foreground">可选</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>状态</Label>
        <Select
          value={form.status ?? "active"}
          onValueChange={(v) => setForm({ ...form, status: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">生效中</SelectItem>
            <SelectItem value="expired">已过期</SelectItem>
            <SelectItem value="lapsed">已失效</SelectItem>
          </SelectContent>
        </Select>
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
          <DialogDescription className="sr-only">填写保单基本信息和保障内容</DialogDescription>
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
        policy_number: policy.policy_number,
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
          <DialogDescription className="sr-only">修改保单信息</DialogDescription>
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRenew, setConfirmRenew] = useState(false);

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
    <>
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{policy.name}</CardTitle>
            <span
              className={`inline-flex items-center shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}
            >
              {statusCfg.label}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-1.5 text-sm">
          <p className="text-muted-foreground">
            {[policy.insurer, typeLabel].filter(Boolean).join(" · ")}
          </p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">保额</span>
            <span className="font-medium tabular-nums font-serif">
              {policy.coverage_amount != null
                ? formatCurrency(policy.coverage_amount, 0)
                : "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">年保费</span>
            <span className="font-medium tabular-nums font-serif">
              {formatCurrency(policy.annual_premium)}
            </span>
          </div>
          {renewal.level !== "none" && (
            <div className={`flex justify-between ${renewalColorClass}`}>
              <span className={renewal.level === "normal" ? "text-muted-foreground" : ""}>
                续费
              </span>
              <span className="tabular-nums">
                <span className="font-serif">{formatDate(policy.next_payment_date)}</span>
                {renewal.days !== null && <> (<span className="font-serif">{renewal.days}</span>天)</>}
              </span>
            </div>
          )}

          {/* Collapsible Detail Section */}
          {expanded && (
            <div className="mt-3 pt-3 border-t space-y-1.5">
              {policy.policy_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">保单编号</span>
                  <span className="font-mono text-xs">{policy.policy_number}</span>
                </div>
              )}
              {policy.coverage_summary && (
                <div>
                  <span className="text-muted-foreground">保障摘要：</span>
                  <span>{policy.coverage_summary}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">生效日期</span>
                <span className="tabular-nums font-serif">{formatDate(policy.start_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">终止日期</span>
                <span className={policy.end_date ? "tabular-nums font-serif" : ""}>{policy.end_date ? formatDate(policy.end_date) : "终身"}</span>
              </div>
              {policy.payment_years != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">缴费年限</span>
                  <span><span className="tabular-nums font-serif">{policy.payment_years}</span>年</span>
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
              onClick={() => setConfirmRenew(true)}
            >
              {renewing ? "处理中..." : "标记续费"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            删除
          </Button>
        </CardFooter>
      </Card>

      {/* Renew Confirmation */}
      <AlertDialog open={confirmRenew} onOpenChange={setConfirmRenew}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>确认续费</AlertDialogTitle>
            <AlertDialogDescription>
              确认「{policy.name}」已完成续费？下次续费日期将顺延一年。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleRenew();
              }}
            >
              确认续费
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除保单「{policy.name}」？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                handleDelete();
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">保单管理</h2>
        <AddPolicyDialog onCreated={fetchData} />
      </div>

      {/* Summary Bar */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-sm border-t-2 border-t-bucket-insurance transition-shadow duration-200 hover:shadow-md">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">
                保单数量
              </p>
              <div className="text-2xl font-semibold tracking-tight">
                <span className="tabular-nums font-serif">{data.summary.active_count}</span>
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  份生效 / <span className="font-serif">{data.summary.total_count}</span> 份总计
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-t-2 border-t-bucket-insurance transition-shadow duration-200 hover:shadow-md">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">
                年缴保费
              </p>
              <div className="text-2xl font-semibold tracking-tight tabular-nums font-serif">
                {formatCurrency(data.summary.total_annual_premium)}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-t-2 border-t-bucket-insurance transition-shadow duration-200 hover:shadow-md">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">
                覆盖人数
              </p>
              <div className="text-2xl font-semibold tracking-tight">
                <span className="tabular-nums font-serif">{data.summary.covered_persons}</span>
                <span className="text-sm font-normal text-muted-foreground ml-1">人</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
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
        <div className="space-y-4">
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
