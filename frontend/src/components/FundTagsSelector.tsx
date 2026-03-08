// 贾维斯: 基金资产标签选择器组件

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FundTags {
  index_type?: string;
  region?: string;
}

interface FundTagsSelectorProps {
  tags: FundTags;
  onIndexTypeChange: (value: string | null) => void;
  onRegionChange: (value: string | null) => void;
}

const INDEX_TYPE_OPTIONS = [
  // 中国
  { value: "csi300", label: "沪深300" },
  { value: "csi500", label: "中证500" },
  { value: "csi1000", label: "中证1000" },
  { value: "创业板指", label: "创业板指" },
  { value: "科创50", label: "科创50" },
  { value: "上证50", label: "上证50" },
  { value: "中证800", label: "中证800" },
  { value: "中证全指", label: "中证全指" },
  { value: "中证红利", label: "中证红利" },
  { value: "上证红利", label: "上证红利" },
  { value: "深证红利", label: "深证红利" },
  { value: "红利指数", label: "红利指数" },
  { value: "红利低波", label: "红利低波" },
  { value: "中证消费", label: "中证消费" },
  { value: "上证消费", label: "上证消费" },
  { value: "深证消费", label: "深证消费" },
  { value: "消费龙头", label: "消费龙头" },
  { value: "主要消费", label: "主要消费" },
  { value: "可选消费", label: "可选消费" },
  // 美国
  { value: "sp500", label: "标普500" },
  { value: "nasdaq100", label: "纳斯达克100" },
  { value: "nasdaqComposite", label: "纳斯达克综指" },
  { value: "russell2000", label: "罗素2000" },
  { value: "dowJones", label: "道琼斯" },
  // 香港
  { value: "hsi", label: "恒生指数" },
  { value: "恒生科技", label: "恒生科技" },
  { value: "国企指数", label: "国企指数" },
  { value: "红筹指数", label: "红筹指数" },
  // 全球
  { value: "msciWorld", label: "MSCI全球" },
  { value: "msciEmerging", label: "MSCI新兴市场" },
  // 其他
  { value: "日经225", label: "日经225" },
  { value: "欧洲50", label: "欧洲斯托克50" },
  { value: "德国DAX", label: "德国DAX" },
  { value: "法国CAC", label: "法国CAC40" },
  { value: "英国FTSE", label: "英国富时100" },
  { value: "黄金", label: "黄金" },
  { value: "原油", label: "原油" },
  { value: "商品", label: "商品" },
  { value: "债券", label: "债券" },
  { value: "REITs", label: "REITs" },
  { value: "其他", label: "其他" },
] as const;

const REGION_OPTIONS = [
  { value: "china", label: "中国" },
  { value: "usa", label: "美国" },
  { value: "hongkong", label: "香港" },
  { value: "japan", label: "日本" },
  { value: "europe", label: "欧洲" },
  { value: "global", label: "全球" },
] as const;

export default function FundTagsSelector({ tags, onIndexTypeChange, onRegionChange }: FundTagsSelectorProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm">资产标签</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>指数类型</Label>
          <Select
            value={tags.index_type ?? ""}
            onValueChange={(v) => onIndexTypeChange(v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择指数类型" />
            </SelectTrigger>
            <SelectContent>
              {INDEX_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>地域</Label>
          <Select
            value={tags.region ?? ""}
            onValueChange={(v) => onRegionChange(v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择地域" />
            </SelectTrigger>
            <SelectContent>
              {REGION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
