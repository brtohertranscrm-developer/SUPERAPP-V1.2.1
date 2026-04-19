import React, { useState } from 'react';
import { Users, Star } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import UsersToolbar from '../../components/admin/users/UsersToolbar';
import UsersTable from '../../components/admin/users/UsersTable';
import GmapsReviewTable from '../../components/admin/users/GmapsReviewTable';

const TABS = [
  { id: 'users',   label: 'Data Pelanggan', icon: Users },
  { id: 'reviews', label: 'Review GMaps',   icon: Star  },
];

export default function AdminUsers() {
  const { users, isLoading, updateKyc, generateCode } = useUsers();
  const [activeTab,  setActiveTab]  = useState('users');
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
          Verifikasi identitas pengguna dan kelola review Google Maps.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1.5 mb-6 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeTab === id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} className={activeTab === id ? 'text-purple-500' : ''} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Data Pelanggan */}
      {activeTab === 'users' && (
        <>
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
          />
        </>
      )}

      {/* Tab: Review GMaps */}
      {activeTab === 'reviews' && (
        <GmapsReviewTable />
      )}

    </div>
  );
}
