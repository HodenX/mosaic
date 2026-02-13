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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { liquidApi } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import type { LiquidAsset, LiquidAssetCreate, LiquidAssetList, LiquidAssetUpdate } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  deposit: "活期存款",
  money_fund: "货币基金",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  return dateStr.split("T")[0];
}

// ---- Add Dialog ----

function AddLiquidDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<LiquidAssetCreate>({
    name: "",
    type: "deposit",
    platform: "",
    amount: 0,
    annual_rate: null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await liquidApi.create(form);
      setOpen(false);
      setForm({ name: "", type: "deposit", platform: "", amount: 0, annual_rate: null });
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>添加活钱</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加活钱资产</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例如 余额宝"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">活期存款</SelectItem>
                  <SelectItem value="money_fund">货币基金</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>平台</Label>
              <Input
                value={form.platform ?? ""}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                placeholder="例如 支付宝"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>金额</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount || ""}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>年化收益率(%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.annual_rate ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, annual_rate: v === "" ? null : parseFloat(v) || 0 });
                }}
                placeholder="可选"
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

// ---- Edit Dialog ----

function EditLiquidDialog({ asset, onUpdated }: { asset: LiquidAsset; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<LiquidAssetUpdate>({
    name: asset.name,
    type: asset.type,
    platform: asset.platform,
    amount: asset.amount,
    annual_rate: asset.annual_rate,
  });

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      setForm({
        name: asset.name,
        type: asset.type,
        platform: asset.platform,
        amount: asset.amount,
        annual_rate: asset.annual_rate,
      });
    }
    setOpen(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await liquidApi.update(asset.id, form);
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
          <DialogTitle>编辑活钱资产 — {asset.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>名称</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例如 余额宝"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <Select
                value={form.type ?? "deposit"}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">活期存款</SelectItem>
                  <SelectItem value="money_fund">货币基金</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>平台</Label>
              <Input
                value={form.platform ?? ""}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                placeholder="例如 支付宝"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>金额</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount || ""}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>年化收益率(%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.annual_rate ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, annual_rate: v === "" ? null : parseFloat(v) || 0 });
                }}
                placeholder="可选"
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

// ---- Main Page ----

export default function LiquidPage() {
  const [data, setData] = useState<LiquidAssetList | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await liquidApi.list();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: number) => {
    await liquidApi.delete(id);
    await fetchData();
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Summary Bar */}
      {data && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-sm border-t-2 border-t-primary transition-shadow duration-200 hover:shadow-md">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">总金额</p>
              <div className="text-2xl font-semibold tracking-tight tabular-nums font-serif">
                {formatCurrency(data.summary.total_amount)}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-t-2 border-t-primary transition-shadow duration-200 hover:shadow-md">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">预估年收益</p>
              <div className="text-2xl font-semibold tracking-tight tabular-nums font-serif">
                {formatCurrency(data.summary.estimated_annual_return)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">活钱管理</h2>
        <AddLiquidDialog onCreated={fetchData} />
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
              <Skeleton className="h-4 w-16" />
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
                <TableHead className="text-right whitespace-nowrap">金额</TableHead>
                <TableHead className="text-right whitespace-nowrap">年化收益率</TableHead>
                <TableHead className="whitespace-nowrap">更新时间</TableHead>
                <TableHead className="whitespace-nowrap">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((asset) => (
                <TableRow key={asset.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium whitespace-nowrap">{asset.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{TYPE_LABELS[asset.type] ?? asset.type}</TableCell>
                  <TableCell className="whitespace-nowrap">{asset.platform}</TableCell>
                  <TableCell className="text-right font-serif tabular-nums whitespace-nowrap">
                    {formatCurrency(asset.amount)}
                  </TableCell>
                  <TableCell className="text-right font-serif tabular-nums whitespace-nowrap">
                    {asset.annual_rate != null ? `${asset.annual_rate.toFixed(2)}%` : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(asset.updated_at)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex gap-1">
                      <EditLiquidDialog asset={asset} onUpdated={fetchData} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(asset.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!data || data.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    暂无活钱资产，点击"添加活钱"开始
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
