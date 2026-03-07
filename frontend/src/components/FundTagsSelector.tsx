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
  { value: "csi300", label: "沪深300" },
  { value: "sp500", label: "标普500" },
  { value: "nasdaq100", label: "纳斯达克100" },
  { value: "csi500", label: "中证500" },
  { value: "hsi", label: "恒生指数" },
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
