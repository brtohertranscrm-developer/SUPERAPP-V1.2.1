import FleetInventoryTable from '../../components/admin/armada/FleetInventoryTable';

export default function AdminFleet() {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">Fleet Inventory</h1>
        <p className="text-sm text-slate-400 mt-1">Kelola ketersediaan dan booking unit armada</p>
      </div>
      <FleetInventoryTable />
    </div>
  );
}