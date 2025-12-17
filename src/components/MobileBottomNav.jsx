import React, { useState, useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Home, ShoppingBag, ShoppingCart, Package, User } from 'lucide-react';
import { useSelector } from 'react-redux';
import AuthModal from './auth/AuthModal';

const MobileBottomNav = () => {
  const location = useLocation();
  const cartItems = useSelector((state) => state.cart);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [user, setUser] = useState(null);

  // Update user state when localStorage changes
  useEffect(() => {
    const updateUser = () => {
      try {
        const userData = localStorage.getItem('user');
        setUser(userData ? JSON.parse(userData) : null);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setUser(null);
      }
    };

    // Initial load
    updateUser();

    // Listen for storage changes
    window.addEventListener('storage', updateUser);
    
    // Listen for custom user change events
    window.addEventListener('userChanged', updateUser);

    // Periodic check as fallback (every 2 seconds)
    const interval = setInterval(updateUser, 2000);

    return () => {
      window.removeEventListener('storage', updateUser);
      window.removeEventListener('userChanged', updateUser);
      clearInterval(interval);
    };
  }, []);

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-white border-t border-gray-200 shadow-lg mobile-bottom-nav" style={{ touchAction: 'manipulation' }}>
        <div className="flex items-center justify-around py-2 px-2">
          {/* Home Tab */}
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 min-w-0 touch-manipulation ${
              location.pathname === '/'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:text-green-600'
            }`}
          >
            <Home className="h-5 w-5 pointer-events-none" />
            <span className="text-xs font-medium leading-none pointer-events-none">Home</span>
          </Link>

          {/* Products Tab */}
          <Link
            to="/allproducts"
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 min-w-0 touch-manipulation ${
              location.pathname === '/allproducts'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:text-green-600'
            }`}
          >
            <ShoppingBag className="h-5 w-5 pointer-events-none" />
            <span className="text-xs font-medium leading-none pointer-events-none">Products</span>
          </Link>

          {/* Cart Tab */}
          <Link
            to="/cart"
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 relative min-w-0 touch-manipulation ${
              location.pathname === '/cart'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:text-green-600'
            }`}
            onClick={(e) => {
              console.log('Cart tab clicked');
              // Fallback navigation
              if (e.currentTarget.getAttribute('href') !== window.location.pathname) {
                window.location.href = '/cart';
              }
              e.stopPropagation();
            }}
          >
            <div className="relative pointer-events-none">
              <ShoppingCart className="h-5 w-5" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-r from-green-600 to-green-400 text-white text-xs flex items-center justify-center shadow-lg">
                  {cartItems.length}
                </span>
              )}
            </div>
            <span className="text-xs font-medium leading-none pointer-events-none">Cart</span>
          </Link>

          {/* My Orders Tab (only if user is logged in) */}
          {user && (
            <Link
              to="/order"
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 min-w-0 touch-manipulation ${
                location.pathname === '/order'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:text-green-600'
              }`}
              onClick={(e) => {
                console.log('Orders tab clicked');
                // Fallback navigation
                if (e.currentTarget.getAttribute('href') !== window.location.pathname) {
                  window.location.href = '/order';
                }
                e.stopPropagation();
              }}
            >
              <Package className="h-5 w-5 pointer-events-none" />
              <span className="text-xs font-medium leading-none pointer-events-none">Orders</span>
            </Link>
          )}

          {/* User Profile Tab */}
          {user ? (
            <Link
              to="/profile"
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 min-w-0 touch-manipulation ${
                location.pathname === '/profile'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:text-green-600'
              }`}
            >
              <User className="h-5 w-5 pointer-events-none" />
              <span className="text-xs font-medium leading-none pointer-events-none">Profile</span>
            </Link>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 text-gray-600 hover:text-green-600 min-w-0 touch-manipulation"
            >
              <User className="h-5 w-5 pointer-events-none" />
              <span className="text-xs font-medium leading-none pointer-events-none">Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        closeModal={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </>
  );
};

export default MobileBottomNav; 