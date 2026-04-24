import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import AdminAccountsSection from '../../components/admin/settings/AdminAccountsSection';
import AuditLogsSection from '../../components/admin/settings/AuditLogsSection';
import DatabaseSection from '../../components/admin/settings/DatabaseSection';
import MotorBillingSection from '../../components/admin/settings/MotorBillingSection';

export default function AdminSettings() {
  const { token, user } = useContext(AuthContext);

  return (
    <div className="space-y-6">
      <AdminAccountsSection token={token} user={user} />
      <MotorBillingSection token={token} />
      <DatabaseSection token={token} />
      <AuditLogsSection token={token} />
    </div>
  );
}

