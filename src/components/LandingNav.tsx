import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { BrandLogo } from '@/components/BrandLogo';

export function LandingNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Contact', href: '/contact' },
  ];

  const handleAuthAction = (action: 'login' | 'register') => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate(`/${action}`);
    }
    setIsMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'fixed top-0 w-full z-50 transition-all duration-300',
        isScrolled 
          ? 'bg-white border-b border-gray-200' 
          : 'bg-white/0'
      )}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2">
            <BrandLogo />
          </NavLink>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'text-gray-900 bg-gray-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )
                }
              >
                {item.name}
              </NavLink>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Button
                onClick={() => navigate('/dashboard')}
                className="h-9 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium"
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="h-9 px-4 border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100 rounded-lg text-sm font-medium"
                  onClick={() => navigate('/demo')}
                >
                  Live demo
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 px-4 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm font-medium"
                  onClick={() => handleAuthAction('login')}
                >
                  Sign in
                </Button>
                <Button
                  onClick={() => handleAuthAction('register')}
                  className="h-9 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium"
                >
                  Get started
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 rounded-lg"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-200 overflow-hidden"
          >
            <div className="px-6 py-4 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'block px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'text-gray-900 bg-gray-100'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )
                  }
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </NavLink>
              ))}
              
              <div className="pt-4 mt-4 border-t border-gray-100 space-y-2">
                {user ? (
                  <Button
                    className="w-full h-10 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium"
                    onClick={() => {
                      navigate('/dashboard');
                      setIsMenuOpen(false);
                    }}
                  >
                    Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full h-10 border-orange-300 bg-orange-50 text-orange-800 rounded-lg text-sm font-medium"
                      onClick={() => {
                        navigate('/demo');
                        setIsMenuOpen(false);
                      }}
                    >
                      Try the live demo
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-10 border-gray-200 rounded-lg text-sm font-medium"
                      onClick={() => handleAuthAction('login')}
                    >
                      Sign in
                    </Button>
                    <Button
                      className="w-full h-10 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium"
                      onClick={() => handleAuthAction('register')}
                    >
                      Get started
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
