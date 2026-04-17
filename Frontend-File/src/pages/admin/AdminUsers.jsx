import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import UsersToolbar from '../../components/admin/users/UsersToolbar';
import UsersTable from '../../components/admin/users/UsersTable';

export default function AdminUsers() {
  const { users, isLoading, updateKyc, generateCode } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKyc, setFilterKyc] = useState('Semua');

  // Filter logika di level orkestrator
  const filteredUsers = users.filter(user => {
    const matchSearch = 
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.phone && String(user.phone).toLowerCase().includes(searchTerm.toLowerCase()));
    
    const currentKyc = user.kyc_status || 'unverified';
    const matchKyc = filterKyc === 'Semua' ? true : currentKyc === filterKyc;
    
    return matchSearch && matchKyc;
  });

  return (
    <div className="animate-fade-in-up pb-10">
      
      {/* HEADER HALAMAN */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Users className="text-purple-500" /> Data Pelanggan
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">Verifikasi identitas pengguna untuk menjaga keamanan aset.</p>
      </div>

      {/* TOOLBAR FILTER & SEARCH */}
      <UsersToolbar 
        filterKyc={filterKyc}
        setFilterKyc={setFilterKyc}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        totalUsers={filteredUsers.length}
      />

      {/* TABEL PENGGUNA */}
      <UsersTable 
        users={filteredUsers} 
        isLoading={isLoading} 
        onUpdateKyc={updateKyc} 
        onGenerateCode={generateCode} 
      />

    </div>
  );
}