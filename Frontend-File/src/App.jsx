import { CityProvider } from './context/CityContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <CityProvider>
      <AppRoutes />
    </CityProvider>
  );
}

export default App;