import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '../contexts/SiteContext';
import { Scissors, Clock, Calendar, ChevronRight, MapPin, Instagram, MessageCircle, Image } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../api';

export default function Home() {
  const { user } = useAuth();
  const { settings } = useSite();
  const [services, setServices] = useState([]);
  const [gallery, setGallery] = useState([]);

  useEffect(() => {
    api.getServices().then(setServices).catch(() => {});
    api.getGallery().then(setGallery).catch(() => {});
  }, []);

  return (
    <div className="animate-fadeIn">
      {/* Hero Section - Simples e direto */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950"></div>
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(238,122,18,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(238,122,18,0.2) 0%, transparent 50%)'
          }}
        ></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            {settings.site_logo && (
              <img src={settings.site_logo} alt={settings.site_name} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-6 shadow-lg" />
            )}

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-white leading-tight mb-4">
              {settings.hero_title || 'Seu Estilo, Nossa Arte'}
            </h1>

            <p className="text-lg text-dark-300 max-w-xl mx-auto mb-8">
              {settings.hero_subtitle || 'Agende seu corte de cabelo de forma rápida e prática.'}
            </p>

            <Link to={user ? "/agendar" : "/register"} className="btn-primary text-lg py-4 px-10 inline-flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5" />
              {user ? (settings.hero_cta || 'Agendar Agora') : 'Começar Agora'}
              <ChevronRight className="w-5 h-5" />
            </Link>

            {!user && (
              <p className="mt-4 text-sm text-dark-500">
                Já tem conta? <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Entre aqui</Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-white text-center mb-8">
          Nossos Serviços
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((service, i) => (
            <Link to={user ? "/agendar" : "/register"} key={service.id}
              className="card-hover group cursor-pointer" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="text-3xl mb-3">{service.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-1">{service.name}</h3>
              <p className="text-sm text-dark-400 mb-3 line-clamp-2">{service.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-primary-400 font-bold">R$ {service.price.toFixed(2)}</span>
                <span className="text-xs text-dark-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{service.duration_minutes}min
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to={user ? "/agendar" : "/register"} className="btn-primary inline-flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Agendar Serviço
          </Link>
        </div>
      </section>

      {/* Gallery Section */}
      {gallery.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark-900/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-8">
              <Image className="w-5 h-5 text-primary-400" />
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
                Nossos Trabalhos
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {gallery.map((img) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square">
                  <img src={img.image_url} alt={img.title || 'Trabalho'} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  {img.title && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <span className="text-white text-sm font-medium">{img.title}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-dark-800 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {settings.site_logo ? (
                <img src={settings.site_logo} alt="" className="w-6 h-6 rounded object-cover" />
              ) : (
                <Scissors className="w-5 h-5 text-primary-500" />
              )}
              <span className="font-bold text-white">{settings.site_name || 'BarberShop'}</span>
            </div>

            <div className="flex items-center gap-4">
              {settings.whatsapp_number && (
                <a href={`https://wa.me/${settings.whatsapp_number}`} target="_blank" rel="noreferrer"
                  className="text-dark-400 hover:text-green-400 transition-colors" title="WhatsApp">
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
              {settings.instagram_url && (
                <a href={settings.instagram_url} target="_blank" rel="noreferrer"
                  className="text-dark-400 hover:text-pink-400 transition-colors" title="Instagram">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {settings.address && (
                <span className="text-sm text-dark-500 flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {settings.address}
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-dark-500 text-center mt-4">
            {settings.footer_text || `© ${new Date().getFullYear()} BarberShop. Todos os direitos reservados.`}
          </p>
        </div>
      </footer>
    </div>
  );
}
