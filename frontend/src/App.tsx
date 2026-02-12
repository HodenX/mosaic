import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import OverviewPage from "@/pages/OverviewPage";
import HoldingsPage from "@/pages/HoldingsPage";
import DataManagementPage from "@/pages/DataManagementPage";
import PositionPage from "@/pages/PositionPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/holdings" element={<HoldingsPage />} />
          <Route path="/position" element={<PositionPage />} />
          <Route path="/data" element={<DataManagementPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
