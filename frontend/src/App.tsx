import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import OverviewPage from "@/pages/OverviewPage";
import HoldingsPage from "@/pages/HoldingsPage";
import DataManagementPage from "@/pages/DataManagementPage";
import FundDetailPage from "@/pages/FundDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/holdings" element={<HoldingsPage />} />
          <Route path="/data" element={<DataManagementPage />} />
          <Route path="/fund/:fundCode" element={<FundDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
