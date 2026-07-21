import ComingSoon from '../components/ComingSoon';
import { IconUserCog } from '../components/Icons';

export default function UserManagement() {
  return <ComingSoon title="User Management" icon={IconUserCog}
    description="Role-based access control for dealers, regional managers and head-office admins. Ships with the auth layer (e.g. Azure AD / SSO) mentioned in the README's production next-steps." />;
}
