import { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CitySelector from '../components/CitySelector';
import Footer from '../components/Footer';
import FloatingHelpWhatsApp from '../components/common/FloatingHelpWhatsApp';
import { CityContext } from '../context/CityContext';

const MainLayout = () => {
  const { selectedCity } = useContext(CityContext) || {};

  return (
    <div className="min-h-screen bg-brand-light font-sans text-brand-dark flex flex-col">
      <CitySelector />
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      {/* Hide floating help while city selector modal is open */}
      {selectedCity ? <FloatingHelpWhatsApp cityHint={selectedCity} /> : null}
    </div>
  );
};

export default MainLayout;
