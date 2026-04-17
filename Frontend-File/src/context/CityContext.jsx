import { createContext, useState } from 'react';

export const CityContext = createContext();

export const CityProvider = ({ children }) => {
  // Default kota awal adalah Yogyakarta
  const [selectedCity, setSelectedCity] = useState('Yogyakarta');

  return (
    <CityContext.Provider value={{ selectedCity, setSelectedCity }}>
      {children}
    </CityContext.Provider>
  );
};