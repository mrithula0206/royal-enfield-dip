import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api';
import {
  IconHome, IconMapPin, IconBuilding, IconBike, IconShare, IconMegaphone, IconShield,
  IconCompass, IconSparkle, IconFileText, IconBarChart, IconDatabase, IconTarget,
  IconUserCog, IconRefresh, IconScroll, IconChevronLeft,
} from './Icons';

const navItem = ({ isActive }) => `nav-item ${isActive ? 'active' : ''}`;

const MAIN_NAV = [
  { to: '/', label: 'Executive Dashboard', icon: IconHome, end: true },
  { to: '/region-performance', label: 'Region Performance', icon: IconMapPin },
  { to: '/dealer-performance', label: 'Dealer Performance', icon: IconBuilding },
  { to: '/model-performance', label: 'Model Performance', icon: IconBike },
  { to: '/source-performance', label: 'Source Performance', icon: IconShare },
  { to: '/campaigns', label: 'Campaigns', icon: IconMegaphone },
  { to: '/campaign-hygiene', label: 'Campaign Hygiene', icon: IconShield, badgeKey: 'hygiene' },
  { to: '/lead-journey', label: 'Lead Journey', icon: IconCompass },
  { to: '/ai-insights', label: 'AI Insights', icon: IconSparkle, badgeKey: 'insights' },
  { to: '/daily-summary', label: 'Daily Summary', icon: IconFileText },
  { to: '/reports', label: 'Reports', icon: IconBarChart },
];

const CONFIG_NAV = [
  { to: '/master-data', label: 'Master Data', icon: IconDatabase },
  { to: '/targets', label: 'Targets', icon: IconTarget },
  { to: '/user-management', label: 'User Management', icon: IconUserCog },
  { to: '/data-sync-status', label: 'Data Sync Status', icon: IconRefresh },
  { to: '/audit-logs', label: 'Audit Logs', icon: IconScroll },
];

export default function Sidebar() {
  const [badges, setBadges] = useState({});

  useEffect(() => {
    api.hygieneSummary().then(s => setBadges(b => ({ ...b, hygiene: s.fail_count }))).catch(() => {});
    api.insights({ severity: 'High', limit: 200 }).then(r => setBadges(b => ({ ...b, insights: r.count }))).catch(() => {});
  }, []);

  const renderItem = (item) => {
    const Icon = item.icon;
    const badgeVal = item.badgeKey ? badges[item.badgeKey] : null;
    return (
      <NavLink key={item.to} to={item.to} end={item.end} className={navItem}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <Icon size={16} /> {item.label}
        </span>
        {!!badgeVal && <span className="badge-num">{badgeVal}</span>}
      </NavLink>
    );
  };

  return (
    <div className="sidebar">
      {MAIN_NAV.map(renderItem)}

      <div className="nav-group-label">Configuration</div>
      {CONFIG_NAV.map(renderItem)}

      <div className="sidebar-footer">
        <button className="collapse-btn"><IconChevronLeft size={14} /> Collapse Menu</button>
      </div>
    </div>
  );
}
