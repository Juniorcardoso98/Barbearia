import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '../contexts/SiteContext';
import { useState } from 'react';
import { Menu, X, Scissors, Calendar, User, LogOut, LayoutDashboard, UserCircle } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { settings } = useSite();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const siteName = settings.site_name || 'BarberShop';
  const showLogo = settings.site_logo && !logoError;

  return (
    <nav className="glass sticky top-0 z-50 border-b border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" onClick={() => setIsOpen(false)}>
            {showLogo ? (
              <img 
                src={settings.site_logo} 
                alt="" 
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-primary-500/20 group-hover:ring-primary-500/40 transition-all" 
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center 
                            group-hover:bg-primary-400 transition-colors">
                <Scissors className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="text-xl font-bold text-white">{siteName}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <Link to="/agendar" className="text-dark-300 hover:text-white transition-colors font-medium">
                  Agendar
                </Link>
                {user.role === 'barber' && (
                  <Link to="/meus-agendamentos" className="text-dark-300 hover:text-white transition-colors font-medium">
                    Agendamentos Clientes
                  </Link>
                )}
                {user.role === 'client' && (
                  <Link to="/meus-agendamentos" className="text-dark-300 hover:text-white transition-colors font-medium">
                    Meus Agendamentos
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-dark-300 hover:text-white transition-colors font-medium">
                    Painel Admin
                  </Link>
                )}
                <div className="flex items-center gap-3 pl-4 border-l border-dark-700">
                  <Link to="/perfil" className="flex items-center gap-2 text-dark-300 hover:text-white transition-colors" title="Meu Perfil">
                    <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-400" />
                    </div>
                    <span className="text-sm">{user.name}</span>
                  </Link>
                  <button onClick={handleLogout} className="text-dark-400 hover:text-red-400 transition-colors" title="Sair">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="btn-secondary text-sm py-2 px-4">Entrar</Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">Cadastrar</Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-dark-300 hover:text-white" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass border-t border-dark-700/50 animate-fadeIn">
          <div className="px-4 py-4 space-y-2">
            {user ? (
              <>
                <Link to="/agendar" onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-dark-300 hover:text-white hover:bg-dark-800 transition-all">
                  <Calendar className="w-5 h-5" /> Agendar
                </Link>
                {user.role === 'barber' && (
                  <Link to="/meus-agendamentos" onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-dark-300 hover:text-white hover:bg-dark-800 transition-all">
                    <Calendar className="w-5 h-5" /> Agendamentos Clientes
                  </Link>
                )}
                {user.role === 'client' && (
                  <Link to="/meus-agendamentos" onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-dark-300 hover:text-white hover:bg-dark-800 transition-all">
                    <Calendar className="w-5 h-5" /> Meus Agendamentos
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-dark-300 hover:text-white hover:bg-dark-800 transition-all">
                    <LayoutDashboard className="w-5 h-5" /> Painel Admin
                  </Link>
                )}
                <div className="border-t border-dark-700 pt-2 mt-2">
                  <Link to="/perfil" onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-dark-300 hover:text-white hover:bg-dark-800 transition-all">
                    <UserCircle className="w-5 h-5" /> Meu Perfil
                  </Link>
                  <div className="flex items-center gap-3 px-4 py-2">
                    <User className="w-5 h-5 text-primary-400" />
                    <span className="text-dark-300">{user.name}</span>
                    <span className="text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full ml-auto">{user.role}</span>
                  </div>
                  <button onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all w-full">
                    <LogOut className="w-5 h-5" /> Sair
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2 pt-2">
                <Link to="/login" onClick={() => setIsOpen(false)} className="block w-full text-center btn-secondary py-3">Entrar</Link>
                <Link to="/register" onClick={() => setIsOpen(false)} className="block w-full text-center btn-primary py-3">Cadastrar</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
