import ComingSoon from '../components/ComingSoon';
import { IconRefresh } from '../components/Icons';

export default function DataSyncStatus() {
  return <ComingSoon title="Data Sync Status" icon={IconRefresh}
    description="Once a live CRM/campaign connector replaces the one-time Excel ingest, this page will show per-source sync health, last-run timestamps and row counts." />;
}
