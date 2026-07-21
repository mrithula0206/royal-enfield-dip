import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FilterProvider } from './FilterContext';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import RegionPerformance from './pages/RegionPerformance';
import DealerPerformance from './pages/DealerPerformance';
import ModelPerformance from './pages/ModelPerformance';
import SourcePerformance from './pages/SourcePerformance';
import Campaigns from './pages/Campaigns';
import CampaignHygiene from './pages/CampaignHygiene';
import LeadJourney from './pages/LeadJourney';
import AIDailySummary from './pages/AIDailySummary';
import DailySummary from './pages/DailySummary';
import Reports from './pages/Reports';
import MasterData from './pages/MasterData';
import Targets from './pages/Targets';
import UserManagement from './pages/UserManagement';
import DataSyncStatus from './pages/DataSyncStatus';
import AuditLogs from './pages/AuditLogs';

export default function App() {
  return (
    <BrowserRouter>
      <FilterProvider>
      <div className="shell">
        <Topbar />
        <Sidebar />
        <main>
          <Routes>
            <Route path="/" element={<ExecutiveDashboard />} />
            <Route path="/region-performance" element={<RegionPerformance />} />
            <Route path="/dealer-performance" element={<DealerPerformance />} />
            <Route path="/model-performance" element={<ModelPerformance />} />
            <Route path="/source-performance" element={<SourcePerformance />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaign-hygiene" element={<CampaignHygiene />} />
            <Route path="/lead-journey" element={<LeadJourney />} />
            <Route path="/ai-insights" element={<AIDailySummary />} />
            <Route path="/daily-summary" element={<DailySummary />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/master-data" element={<MasterData />} />
            <Route path="/targets" element={<Targets />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/data-sync-status" element={<DataSyncStatus />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
          </Routes>
        </main>
      </div>
      </FilterProvider>
    </BrowserRouter>
  );
}
