import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 1. LAYOUTS & GUARDS
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import { AdminRoute } from './ProtectedRoute';

// 2. PUBLIC PAGES
import Home from '../pages/public/Home';
import SearchPage from '../pages/public/SearchPage';
import SearchResults from '../pages/public/SearchResults';
import MotorCatalog from '../pages/public/MotorCatalog';
import LockerCatalog from '../pages/public/LockerCatalog';
import CarCatalog from '../pages/public/CarCatalog';
import ArticleList from '../pages/public/ArticleList';
import ArticleDetail from '../pages/public/ArticleDetail';
import LoginPage from '../pages/public/LoginPage';
import RegisterPage from '../pages/public/RegisterPage';
import VerifyEmailPage from '../pages/public/VerifyEmailPage';
import GoogleCompleteProfilePage from '../pages/public/GoogleCompleteProfilePage';
import ResetPasswordPage from '../pages/public/ResetPasswordPage';
import TermsPage from '../pages/public/TermsPage';
import PrivacyPage from '../pages/public/PrivacyPage';

// 3. USER PAGES (PROTECTED)
import Dashboard from '../pages/user/Dashboard';
import KycPage from '../pages/user/KycPage';
import CheckoutMotor from '../pages/user/CheckoutMotor';
import CheckoutLocker from '../pages/user/CheckoutLocker';
import CheckoutCar from '../pages/user/CheckoutCar';
import PaymentPage from '../pages/user/PaymentPage';
import TransferConfirmation from '../pages/user/TransferConfirmation';
import Rewards from '../pages/user/Rewards';
import TripHistory from '../pages/user/TripHistory';
import SupportPage from '../pages/user/SupportPage';
import ReferralPage from '../pages/user/ReferralPage';

// 4. ADMIN PAGES (PROTECTED)
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminBooking from '../pages/admin/AdminBooking';
import AdminArmada from '../pages/admin/AdminArmada';
import AdminCars from '../pages/admin/AdminCars';
import AdminFleet from '../pages/admin/AdminFleet';
import AdminLoker from '../pages/admin/AdminLoker';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminKyc from '../pages/admin/AdminKyc';
import AdminPricing from '../pages/admin/AdminPricing';
import AdminArtikel from '../pages/admin/AdminArtikel'; 
import AdminPromotions from '../pages/admin/AdminPromotions';    
import AdminSupport from '../pages/admin/AdminSupport';
import AdminInvoice from '../pages/admin/AdminInvoice'; // Tambahkan baris ini
import AdminSettings from '../pages/admin/AdminSettings';
import AdminFinance from '../pages/admin/AdminFinance';
import AdminReferral from '../pages/admin/AdminReferral';
import AdminAddons from '../pages/admin/AdminAddons';
import AdminLogistics from '../pages/admin/AdminLogistics';
import AdminPartners from '../pages/admin/AdminPartners';
import AdminManning from '../pages/admin/AdminManning';
import AdminStaffDashboard from '../pages/admin/AdminStaffDashboard';
import AdminGmapsReview from '../pages/admin/AdminGmapsReview';
import AdminMilesRewards from '../pages/admin/AdminMilesRewards';
import BodyScrollReset from '../components/common/BodyScrollReset';
import { useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getAdminLandingPath, parsePerms } from '../utils/adminNavigation';

const AdminIndexRedirect = () => {
  const { user } = useContext(AuthContext) || {};
  const perms = useMemo(() => parsePerms(user), [user]);
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const canDashboard = isSuperAdmin || perms.includes('dashboard');
  const canLogistics = isSuperAdmin || perms.includes('logistics');
  const canBooking = isSuperAdmin || perms.includes('booking');

  if (!user) return <Navigate to="/login" replace />;
  if (canDashboard && canBooking) return <Navigate to="/admin/dashboard" replace />;
  if (canLogistics && !canBooking) return <Navigate to="/admin/staff" replace />;
  return <Navigate to={getAdminLandingPath(user)} replace />;
};

const AppRoutes = () => {
  return (
    <Router>
      <BodyScrollReset />
      <Routes>
        {/* RUTE PUBLIC & USER */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search-page" element={<SearchPage />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/motor" element={<MotorCatalog />} />
          <Route path="/mobil" element={<CarCatalog />} />
          <Route path="/loker" element={<LockerCatalog />} />
          <Route path="/artikel" element={<ArticleList />} />
          <Route path="/artikel/:id" element={<ArticleDetail />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/google/complete-profile" element={<GoogleCompleteProfilePage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          
          {/* User Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/kyc" element={<KycPage />} />
          <Route path="/checkout-motor" element={<CheckoutMotor />} />
          <Route path="/checkout-loker" element={<CheckoutLocker />} />
          <Route path="/checkout-mobil" element={<CheckoutCar />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/payment/:orderId" element={<PaymentPage />} />
          <Route path="/transfer-confirmation" element={<TransferConfirmation />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/trip-history" element={<TripHistory />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/referral" element={<ReferralPage />} />
        </Route>

        {/* RUTE ADMIN */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminIndexRedirect />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="booking" element={<AdminBooking />} />
          <Route path="armada" element={<AdminArmada />} />
          <Route path="cars" element={<AdminCars />} />
          <Route path="loker" element={<AdminLoker />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="kyc" element={<AdminKyc />} />
          <Route path="pricing" element={<AdminPricing />} /> 
          <Route path="artikel" element={<AdminArtikel />} /> {/* Path dirapikan */}
          <Route path="promotions" element={<AdminPromotions />} />    
          <Route path="partners" element={<AdminPartners />} />
          <Route path="addons" element={<AdminAddons />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="invoice/:id" element={<AdminInvoice />} /> {/* Rute untuk halaman invoice */}
          <Route path="settings" element={<AdminSettings />} />
          <Route path="finance" element={<AdminFinance />} />
          <Route path="referral" element={<AdminReferral />} />
          <Route path="fleet" element={<AdminFleet />} />
          <Route path="logistics" element={<AdminLogistics />} />
          <Route path="staff" element={<AdminStaffDashboard />} />
          <Route path="manning" element={<AdminManning />} />
          <Route path="gmaps-review" element={<AdminGmapsReview />} />
          <Route path="miles-rewards" element={<AdminMilesRewards />} />

        </Route>

        {/* CATCH-ALL ROUTE */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};



export default AppRoutes;
