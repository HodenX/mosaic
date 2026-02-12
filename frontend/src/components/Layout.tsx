import { useState } from "react";
import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import FundDetailPanel from "@/components/FundDetailPanel";
import { FundDetailProvider } from "@/contexts/FundDetailContext";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  // Initialize dark mode from localStorage
  useState(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    }
  });

  return (
    <FundDetailProvider>
      <div className="min-h-screen bg-background">
        <Sidebar collapsed={collapsed} onToggle={handleToggle} />
        <main
          className={cn(
            "min-h-screen transition-[margin-left] duration-200 px-6 py-6",
            collapsed ? "ml-16" : "ml-60"
          )}
        >
          <Outlet />
        </main>
        <FundDetailPanel />
      </div>
    </FundDetailProvider>
  );
}
