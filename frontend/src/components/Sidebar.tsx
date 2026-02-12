import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Droplets,
  Landmark,
  TrendingUp,
  Shield,
  Database,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Moon,
  Sun,
} from "lucide-react";

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  prefix: string;
  mainPath: string;
  children: { label: string; path: string }[];
}

const navGroups: NavGroup[] = [
  {
    label: "活钱",
    icon: Droplets,
    prefix: "/liquid",
    mainPath: "/liquid",
    children: [{ label: "活钱管理", path: "/liquid" }],
  },
  {
    label: "稳钱",
    icon: Landmark,
    prefix: "/stable",
    mainPath: "/stable",
    children: [{ label: "稳钱管理", path: "/stable" }],
  },
  {
    label: "长钱",
    icon: TrendingUp,
    prefix: "/growth",
    mainPath: "/growth/overview",
    children: [
      { label: "组合概览", path: "/growth/overview" },
      { label: "持仓明细", path: "/growth/holdings" },
      { label: "仓位管理", path: "/growth/position" },
    ],
  },
  {
    label: "保险",
    icon: Shield,
    prefix: "/insurance",
    mainPath: "/insurance",
    children: [{ label: "保单管理", path: "/insurance" }],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Track which groups are manually expanded/collapsed
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    const isDark = document.documentElement.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  const isGroupActive = (prefix: string) =>
    location.pathname.startsWith(prefix);

  const isGroupExpanded = (group: NavGroup) => {
    // If manually toggled, use that state; otherwise auto-expand if active
    if (group.prefix in expandedGroups) {
      return expandedGroups[group.prefix];
    }
    return isGroupActive(group.prefix);
  };

  const toggleGroup = (prefix: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [prefix]: !isGroupExpanded(
        navGroups.find((g) => g.prefix === prefix)!
      ),
    }));
  };

  const activeLinkClass =
    "bg-sidebar-accent text-primary font-medium border-l-3 border-primary -ml-0.5";
  const inactiveLinkClass =
    "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-4 gap-2.5">
        <img
          src="/logo.svg"
          alt="FolioPal"
          className="h-8 w-8 shrink-0 rounded-lg"
        />
        {!collapsed && (
          <div className="flex flex-col leading-tight truncate">
            <span className="text-sm font-bold tracking-wide text-primary">
              FolioPal
            </span>
            <span className="text-[10px] text-sidebar-foreground/50">聚宝</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {/* Dashboard - top level */}
        <Link
          to="/dashboard"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
            location.pathname === "/dashboard"
              ? activeLinkClass
              : inactiveLinkClass
          )}
        >
          <LayoutDashboard
            className={cn(
              "h-4 w-4 shrink-0",
              location.pathname === "/dashboard" && "text-primary"
            )}
          />
          {!collapsed && <span className="truncate">资产总览</span>}
        </Link>

        {/* Bucket groups */}
        {navGroups.map((group) => {
          const Icon = group.icon;
          const groupActive = isGroupActive(group.prefix);
          const expanded = isGroupExpanded(group);

          return (
            <div key={group.prefix}>
              {/* Group header */}
              {collapsed ? (
                // Collapsed mode: single icon button that navigates
                <button
                  onClick={() => navigate(group.mainPath)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                    groupActive ? activeLinkClass : inactiveLinkClass
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      groupActive && "text-primary"
                    )}
                  />
                </button>
              ) : (
                // Expanded mode: clickable header with chevron
                <button
                  onClick={() => toggleGroup(group.prefix)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                    groupActive
                      ? "text-primary font-medium"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      groupActive && "text-primary"
                    )}
                  />
                  <span className="truncate flex-1 text-left">
                    {group.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                      expanded && "rotate-180"
                    )}
                  />
                </button>
              )}

              {/* Sub-items (only when sidebar expanded and group expanded) */}
              {!collapsed && expanded && (
                <div className="ml-4 mt-0.5 space-y-0.5">
                  {group.children.map((child) => {
                    const childActive = location.pathname === child.path;
                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                          childActive ? activeLinkClass : inactiveLinkClass
                        )}
                      >
                        <span className="truncate">{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Separator */}
        <div className="my-2 border-t border-sidebar-border" />

        {/* Data management */}
        <Link
          to="/data"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
            location.pathname === "/data" ? activeLinkClass : inactiveLinkClass
          )}
        >
          <Database
            className={cn(
              "h-4 w-4 shrink-0",
              location.pathname === "/data" && "text-primary"
            )}
          />
          {!collapsed && <span className="truncate">数据管理</span>}
        </Link>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-2 py-3 space-y-0.5">
        <button
          onClick={toggleDark}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-150"
        >
          <Moon className="h-4 w-4 shrink-0 dark:hidden" />
          <Sun className="hidden h-4 w-4 shrink-0 dark:block" />
          {!collapsed && <span>切换主题</span>}
        </button>
        <button
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-150"
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span>收起侧栏</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
