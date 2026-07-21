import ComingSoon from '../components/ComingSoon';
import { IconScroll } from '../components/Icons';

export default function AuditLogs() {
  return <ComingSoon title="Audit Logs" icon={IconScroll}
    description="A record of who changed targets, regenerated insights, or edited master data. Needs the auth layer in place first so actions can be attributed to a user." />;
}
