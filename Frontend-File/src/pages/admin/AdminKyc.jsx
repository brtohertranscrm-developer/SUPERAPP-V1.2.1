import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useKyc } from '../../hooks/useKyc';
import CodeGenerator from '../../components/admin/kyc/CodeGenerator';
import KycTable from '../../components/admin/kyc/KycTable';

export default function AdminKyc() {
  const { kycData, isLoading, updateKycStatus } = useKyc();

  return (
    <div className="animate-fade-in-up pb-10">
      
      {/* HEADER HALAMAN */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-brand-dark tracking-tight flex items-center gap-2">
          <ShieldCheck className="text-amber-500" /> Verifikasi KYC
        </h1>
        <p className="text-gray-500 text-sm mt-1">Buat kode akses dan hubungi pelanggan via WhatsApp untuk proses verifikasi identitas.</p>
      </div>

      {/* GENERATOR KODE */}
      <CodeGenerator />

      {/* TABEL PELANGGAN */}
      <KycTable 
        data={kycData} 
        isLoading={isLoading} 
        onUpdateStatus={updateKycStatus} 
      />

    </div>
  );
}