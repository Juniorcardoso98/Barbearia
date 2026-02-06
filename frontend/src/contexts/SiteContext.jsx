import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const SiteContext = createContext(null);

const DEFAULT_SETTINGS = {
  site_name: 'BarberShop',
  site_logo: '',
  hero_title: 'Seu Estilo, Nossa Arte',
  hero_subtitle: 'Agende seu corte de cabelo, barba e outros serviços de forma rápida e prática.',
  hero_cta: 'Agendar Agora',
  footer_text: '© 2026 BarberShop. Todos os direitos reservados.',
  whatsapp_number: '',
  instagram_url: '',
  address: '',
};

export function SiteProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = () => {
    api.getSettings()
      .then(data => setSettings(prev => ({ ...prev, ...data })))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSettings = async (newSettings) => {
    const updated = await api.updateSettings(newSettings);
    setSettings(prev => ({ ...prev, ...updated }));
    return updated;
  };

  return (
    <SiteContext.Provider value={{ settings, loading, updateSettings, reloadSettings: loadSettings }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (!context) throw new Error('useSite must be used within SiteProvider');
  return context;
}
