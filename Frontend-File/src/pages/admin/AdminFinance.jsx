import React, { useState } from 'react';
import { TrendingUp, FileText, Receipt, Users } from 'lucide-react';

import {
  useReconciliations,
  useExpenses,
  useFinanceSummary,
  useVendorPayouts
} from '../../hooks/useFinance';

import ReconciliationTable from '../../components/admin/finance/ReconciliationTable';
import ReconciliationModal from '../../components/admin/finance/ReconciliationModal';
import ExpenseTable from '../../components/admin/finance/ExpenseTable';
import ExpenseModal from '../../components/admin/finance/ExpenseModal';
import FinanceSummary from '../../components/admin/finance/FinanceSummary';
import VendorPayoutTable from '../../components/admin/finance/VendorPayoutTable';

const TABS = [
  { key: 'rekonsiliasi', label: 'Rekonsiliasi',  icon: FileText },
  { key: 'pengeluaran',  label: 'Pengeluaran',   icon: Receipt },
  { key: 'laporan',      label: 'Laporan P&L',   icon: TrendingUp },
  { key: 'payout',       label: 'Payout Vendor', icon: Users }
];

const AdminFinance = () => {
  const [activeTab, setActiveTab] = useState('rekonsiliasi');

  // Modal state
  const [showReconModal, setShowReconModal]   = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense]    = useState(null);

  // Hooks
  const recon   = useReconciliations();
  const expense = useExpenses();
  const summary = useFinanceSummary();
  const payout  = useVendorPayouts();

  const handleEditExpense = (item) => {
    setEditingExpense(item);
    setShowExpenseModal(true);
  };

  const handleCloseExpenseModal = () => {
    setEditingExpense(null);
    setShowExpenseModal(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-screen-xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <TrendingUp size={26} className="text-blue-500" />
            Finance
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Rekonsiliasi, pengeluaran, laporan P&L, dan payout vendor</p>
        </div>

        {/* Tombol aksi utama per tab */}
        {activeTab === 'rekonsiliasi' && (
          <button
            onClick={() => setShowReconModal(true)}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-md transition-colors shrink-0"
          >
            + Upload Bukti Transfer
          </button>
        )}
        {activeTab === 'pengeluaran' && (
          <button
            onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-md transition-colors shrink-0"
          >
            + Catat Pengeluaran
          </button>
        )}
      </div>

      {/* Tab Navigasi */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>

              {/* Badge notifikasi untuk rekonsiliasi pending */}
              {tab.key === 'rekonsiliasi' && recon.reconciliations.filter((r) => r.status === 'pending').length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/30 text-white' : 'bg-amber-500 text-white'}`}>
                  {recon.reconciliations.filter((r) => r.status === 'pending').length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Konten Tab */}
      <div>
        {activeTab === 'rekonsiliasi' && (
          <ReconciliationTable
            data={recon.reconciliations}
            isLoading={recon.isLoading}
            onMatch={recon.matchReconciliation}
            onReject={recon.rejectReconciliation}
          />
        )}

        {activeTab === 'pengeluaran' && (
          <ExpenseTable
            data={expense.expenses}
            isLoading={expense.isLoading}
            onEdit={handleEditExpense}
            onDelete={expense.deleteExpense}
          />
        )}

        {activeTab === 'laporan' && (
          <FinanceSummary
            summary={summary.summary}
            chartData={summary.chartData}
            breakdown={summary.breakdown}
            isLoading={summary.isLoading}
            month={summary.month}
            setMonth={summary.setMonth}
            year={summary.year}
            setYear={summary.setYear}
          />
        )}

        {activeTab === 'payout' && (
          <VendorPayoutTable
            data={payout.payouts}
            isLoading={payout.isLoading}
            onGenerate={payout.generatePayouts}
            onApprove={payout.approvePayout}
            onMarkPaid={payout.markPaid}
          />
        )}
      </div>

      {/* Modal Rekonsiliasi */}
      {showReconModal && (
        <ReconciliationModal
          onClose={() => setShowReconModal(false)}
          onSubmit={recon.addReconciliation}
        />
      )}

      {/* Modal Pengeluaran (tambah + edit) */}
      {showExpenseModal && (
        <ExpenseModal
          onClose={handleCloseExpenseModal}
          onSubmit={editingExpense ? expense.editExpense : expense.addExpense}
          initialData={editingExpense}
        />
      )}
    </div>
  );
};

export default AdminFinance;
