import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import DashboardPage from "@/pages/DashboardPage";
import DiagnosisPage from "@/pages/DiagnosisPage";
import OverviewPage from "@/pages/OverviewPage";
import HoldingsPage from "@/pages/HoldingsPage";
import DataManagementPage from "@/pages/DataManagementPage";
import PositionPage from "@/pages/PositionPage";
import LiquidPage from "@/pages/LiquidPage";
import StablePage from "@/pages/StablePage";
import InsurancePage from "@/pages/InsurancePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/diagnosis" element={<DiagnosisPage />} />
          <Route path="/liquid" element={<LiquidPage />} />
          <Route path="/stable" element={<StablePage />} />
          <Route path="/growth/overview" element={<OverviewPage />} />
          <Route path="/growth/holdings" element={<HoldingsPage />} />
          <Route path="/growth/position" element={<PositionPage />} />
          <Route path="/insurance" element={<InsurancePage />} />
          <Route path="/data" element={<DataManagementPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
