// 贾维斯: 基金标签徽章组件

interface FundTagsBadgesProps {
  indexType?: string | null;
  region?: string | null;
}

const INDEX_TYPE_LABELS: Record<string, string> = {
  csi300: "沪深300",
  sp500: "标普500",
  nasdaq100: "纳斯达克100",
  csi500: "中证500",
  hsi: "恒生指数",
};

const REGION_LABELS: Record<string, string> = {
  china: "中国",
  usa: "美国",
  hongkong: "香港",
  japan: "日本",
  europe: "欧洲",
  global: "全球",
};

export function FundTagsBadges({ indexType, region }: FundTagsBadgesProps) {
  const tags: { label: string; variant: "default" | "secondary" }[] = [];

  if (indexType && INDEX_TYPE_LABELS[indexType]) {
    tags.push({ label: INDEX_TYPE_LABELS[indexType], variant: "default" });
  }

  if (region && REGION_LABELS[region]) {
    tags.push({ label: REGION_LABELS[region], variant: "secondary" });
  }

  if (tags.length === 0) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag.label}
          className={`text-xs px-1.5 py-0 rounded ${
            tag.variant === "default"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}
