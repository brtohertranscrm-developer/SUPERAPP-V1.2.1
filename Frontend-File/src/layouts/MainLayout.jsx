import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CitySelector from '../components/CitySelector';
import Footer from '../components/Footer';

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-brand-light font-sans text-brand-dark flex flex-col">
      <CitySelector />
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;