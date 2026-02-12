import { useCallback, useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { stableApi } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import type { StableAsset, StableAssetCreate, StableAssetList, StableAssetUpdate } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  term_deposit: "定期存款",
  bank_product: "银行理财",
};

function getMaturityStatus(maturityDate: string | null): {
  days: number | null;
  level: "expired" | "urgent" | "warning" | "normal" | "none";
} {
  if (!maturityDate) return { days: null, level: "none" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maturity = new Date(maturityDate);
  const diffDays = Math.ceil((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { days: diffDays, level: "expired" };
  if (diffDays <= 7) return { days: diffDays, level: "urgent" };
  if (diffDays <= 30) return { days: diffDays, level: "warning" };
  return { days: diffDays, level: "normal" };
}

function formatMaturityDate(maturityDate: string | null) {
  if (!maturityDate) return "-";
  const { days, level } = getMaturityStatus(maturityDate);

  const dateStr = maturityDate;
  let label = "";
  let className = "";

  switch (level) {
    case "expired":
      label = "已到期";
      className = "text-muted-foreground";
      break;
    case "urgent":
      label = `${days}天`;
      className = "text-red-600 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded";
      break;
    case "warning":
      label = `${days}天`;
      className = "text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded";
      break;
    case "normal":
      label = `${days}天`;
      className = "";
      break;
    default:
      break;
  }

  return (
    <span className={className}>
      {dateStr}{label ? ` (${label})` : ""}
    </span>
  );
}

const emptyCreate: StableAssetCreate = {
  name: "",
  type: "term_deposit",
  platform: "",
  amount: 0,
  annual_rate: 0,
  start_date: null,
  maturity_date: null,
};

function AddStableDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<StableAssetCreate>({ ...emptyCreate });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await stableApi.create({
        ...form,
        annual_rate: form.annual_rate ?? 0,
        start_date: form.start_date || null,
        maturity_date: form.maturity_date || null,
      });
      setOpen(false);
      setForm({ ...emptyCreate });
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>添加稳钱</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加稳钱资产</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例如 工行3年定期"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="border-input bg-transparent h-9 w-full rounded-md border px-3 py-1 text-base shadow-xs md:text-sm"
              >
                <option value="term_deposit">定期存款</option>
                <option value="bank_product">银行理财</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>平台</Label>
              <Input
                value={form.platform ?? ""}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                placeholder="例如 工商银行"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>本金</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount || ""}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>年化利率(%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.annual_rate || ""}
                onChange={(e) => setForm({ ...form, annual_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>起始日期</Label>
              <Input
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => setForm({ ...form, start_date: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label>到期日期</Label>
              <Input
                type="date"
                value={form.maturity_date ?? ""}
                onChange={(e) => setForm({ ...form, maturity_date: e.target.value || null })}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "添加中..." : "确认添加"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditStableDialog({
  asset,
  onUpdated,
}: {
  asset: StableAsset;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<StableAssetUpdate>({});

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      setForm({
        name: asset.name,
        type: asset.type,
        platform: asset.platform,
        amount: asset.amount,
        annual_rate: asset.annual_rate,
        start_date: asset.start_date,
        maturity_date: asset.maturity_date,
      });
    }
    setOpen(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await stableApi.update(asset.id, {
        ...form,
        annual_rate: form.annual_rate != null ? form.annual_rate : undefined,
        start_date: form.start_date || null,
        maturity_date: form.maturity_date || null,
      });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑 — {asset.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>名称</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <select
                value={form.type ?? ""}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="border-input bg-transparent h-9 w-full rounded-md border px-3 py-1 text-base shadow-xs md:text-sm"
              >
                <option value="term_deposit">定期存款</option>
                <option value="bank_product">银行理财</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>平台</Label>
              <Input
                value={form.platform ?? ""}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>本金</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount || ""}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>年化利率(%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.annual_rate || ""}
                onChange={(e) => setForm({ ...form, annual_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>起始日期</Label>
              <Input
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => setForm({ ...form, start_date: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label>到期日期</Label>
              <Input
                type="date"
                value={form.maturity_date ?? ""}
                onChange={(e) => setForm({ ...form, maturity_date: e.target.value || null })}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "提交中..." : "确认更新"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function StablePage() {
  const [data, setData] = useState<StableAssetList | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await stableApi.list();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: number) => {
    await stableApi.delete(id);
    await fetchData();
  };

  const sortedItems = [...(data?.items ?? [])].sort((a, b) => {
    if (!a.maturity_date && !b.maturity_date) return 0;
    if (!a.maturity_date) return 1;
    if (!b.maturity_date) return -1;
    return a.maturity_date.localeCompare(b.maturity_date);
  });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Summary Bar */}
      {data && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="py-4">
            <CardContent className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">总金额</span>
              <span className="text-xl font-semibold font-mono tabular-nums">
                {formatCurrency(data.summary.total_amount)}
              </span>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">预估年收益</span>
              <span className="text-xl font-semibold font-mono tabular-nums">
                {formatCurrency(data.summary.estimated_annual_return)}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">稳钱管理</h2>
        <AddStableDialog onCreated={fetchData} />
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <div className="bg-muted/30 h-10" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-t">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-16 ml-auto" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="whitespace-nowrap">名称</TableHead>
                <TableHead className="whitespace-nowrap">类型</TableHead>
                <TableHead className="whitespace-nowrap">平台</TableHead>
                <TableHead className="text-right whitespace-nowrap">本金</TableHead>
                <TableHead className="text-right whitespace-nowrap">年化利率</TableHead>
                <TableHead className="whitespace-nowrap">起始日期</TableHead>
                <TableHead className="whitespace-nowrap">到期日期</TableHead>
                <TableHead className="whitespace-nowrap">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {TYPE_LABELS[item.type] ?? item.type}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{item.platform || "-"}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">
                    {formatCurrency(item.amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">
                    {item.annual_rate.toFixed(2)}%
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {item.start_date ?? "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatMaturityDate(item.maturity_date)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex gap-1">
                      <EditStableDialog asset={item} onUpdated={fetchData} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive active:scale-[0.97] transition-transform duration-100"
                        onClick={() => handleDelete(item.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sortedItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    暂无稳钱资产，点击"添加稳钱"开始
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
