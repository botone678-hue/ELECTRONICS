import React, { createContext, useContext, useState, useEffect } from 'react';
import { BusinessSettings } from '../types';
import { api } from '../services/api';

interface SettingsContextType {
  settings: BusinessSettings;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: BusinessSettings = {
  businessName: 'MEGA CITY ELECTRONICS',
  phone: '0741775878',
  whatsapp: '0741775878',
  location: 'Along Zion Mall, Kenya',
  businessHours: 'Mon - Sat: 8:00 AM - 8:00 PM | Sun: 10:00 AM - 6:00 PM',
  announcementText: '🔥 CASH ON DELIVERY AVAILABLE | 📞 0741775878 | 📍 ZION MALL',
  freeDeliveryThreshold: 20000,
  acceptOrders: true
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);

  const refreshSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (e) {
      console.warn('Could not fetch store settings, using defaults:', e);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
