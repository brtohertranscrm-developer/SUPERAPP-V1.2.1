import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import UsersToolbar from '../../components/admin/users/UsersToolbar';
import UsersTable from '../../components/admin/users/UsersTable';

export default function AdminUsers() {
  const { users, isLoading, updateKyc, generateCode, deleteUser } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKyc,  setFilterKyc]  = useState('Semua');

  const filteredUsers = users.filter((user) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      (user.name  && user.name.toLowerCase().includes(q))  ||
      (user.email && user.email.toLowerCase().includes(q)) ||
      (user.phone && String(user.phone).includes(q));

    const userKyc  = user.kyc_status || 'unverified';
    const matchKyc = filterKyc === 'Semua' || userKyc === filterKyc;

    return matchSearch && matchKyc;
  });

  return (
    <div className="animate-fade-in-up pb-10">

      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Users className="text-purple-500" /> Data Pelanggan
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Kelola dan verifikasi identitas pengguna.
        </p>
      </div>

      <UsersToolbar
        filterKyc={filterKyc}
        setFilterKyc={setFilterKyc}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        totalUsers={filteredUsers.length}
      />
      <UsersTable
        users={filteredUsers}
        isLoading={isLoading}
        onUpdateKyc={updateKyc}
        onGenerateCode={generateCode}
        onDeleteUser={deleteUser}
      />

    </div>
  );
}
