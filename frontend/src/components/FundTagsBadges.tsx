// 贾维斯: 基金标签徽章组件

interface FundTagsBadgesProps {
  indexType?: string | null;
  region?: string | null;
}

const INDEX_TYPE_LABELS: Record<string, string> = {
  // 中国
  csi300: "沪深300",
  csi500: "中证500",
  csi1000: "中证1000",
  创业板指: "创业板指",
  科创50: "科创50",
  上证50: "上证50",
  中证800: "中证800",
  中证全指: "中证全指",
  中证红利: "中证红利",
  上证红利: "上证红利",
  深证红利: "深证红利",
  红利指数: "红利指数",
  红利低波: "红利低波",
  中证消费: "中证消费",
  上证消费: "上证消费",
  深证消费: "深证消费",
  消费龙头: "消费龙头",
  主要消费: "主要消费",
  可选消费: "可选消费",
  // 美国
  sp500: "标普500",
  nasdaq100: "纳斯达克100",
  nasdaqComposite: "纳斯达克综指",
  russell2000: "罗素2000",
  dowJones: "道琼斯",
  // 香港
  hsi: "恒生指数",
  恒生科技: "恒生科技",
  国企指数: "国企指数",
  红筹指数: "红筹指数",
  // 全球
  msciWorld: "MSCI全球",
  msciEmerging: "MSCI新兴市场",
  // 其他
  日经225: "日经225",
  欧洲50: "欧洲斯托克50",
  德国DAX: "德国DAX",
  法国CAC: "法国CAC40",
  英国FTSE: "英国富时100",
  黄金: "黄金",
  原油: "原油",
  商品: "商品",
  债券: "债券",
  REITs: "REITs",
  其他: "其他",
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
