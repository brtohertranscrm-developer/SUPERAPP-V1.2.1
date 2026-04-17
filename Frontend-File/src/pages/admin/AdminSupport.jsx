import React, { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { useSupport } from '../../hooks/useSupport';
import SupportToolbar from '../../components/admin/support/SupportToolbar';
import SupportGrid from '../../components/admin/support/SupportGrid';

export default function AdminSupport() {
  const { tickets, isLoading, updateTicketStatus } = useSupport();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');

  // Logika filter dipisah agar mudah dilempar ke komponen Grid
  const filteredTickets = tickets.filter(ticket => {
    const matchSearch = 
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = filterStatus === 'Semua' ? true : ticket.status === filterStatus;
    
    return matchSearch && matchStatus;
  });

  return (
    <div className="animate-fade-in-up pb-10">
      
      {/* HEADER HALAMAN */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <LifeBuoy className="text-amber-500" /> Pusat Bantuan
        </h1>
        <p className="text-slate-500 text-sm mt-1">Tanggapi keluhan, masalah teknis, dan laporan dari pelanggan.</p>
      </div>

      {/* TOOLBAR: SEARCH & FILTER */}
      <SupportToolbar 
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* GRID DAFTAR TIKET */}
      <SupportGrid 
        tickets={filteredTickets} 
        isLoading={isLoading} 
        onUpdateStatus={updateTicketStatus} 
      />

    </div>
  );
}