import { Fragment, useContext, useState, useEffect } from 'react'
import { Dialog, Transition, Menu } from '@headlessui/react'
import { Link, useLocation } from '@tanstack/react-router'
import { Menu as MenuIcon, ShoppingCart, X, Home, ShoppingBag, HelpCircle, Info, Package, LayoutDashboard, User, LogOut, Settings } from 'lucide-react'
import { useSelector } from 'react-redux'
import myContext from '../../context/data/myContext'
import AuthModal from '../auth/AuthModal'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const cartItems = useSelector((state) => state.cart)
  const user = JSON.parse(localStorage.getItem('user'))
  const location = useLocation()

  const logout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('userRole')
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('userChanged'))
    window.location.href = "/"
  }

  const context = useContext(myContext)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'All Products', path: '/allproducts' },
    { name: 'Why Us', path: '/whyus' },
    { name: 'About', path: '/about' },
  ]

  if (user) {
    navLinks.splice(2, 0, { name: 'My Orders', path: '/order' })
  }

  // Check if user has dashboard access (admin or delivery boy)
  const userRole = localStorage.getItem('userRole');
  if (user?.user?.email === 'omprakash16003@gmail.com' || 
      userRole === 'master_admin' || 
      userRole === 'sub_admin' || 
      userRole === 'delivery_boy') {
    const dashboardLabel = userRole === 'delivery_boy' ? 'Delivery' : 'Admin';
    navLinks.splice(-1, 0, { name: dashboardLabel, path: '/dashboard' })
  }

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const navIcons = {
    'Home': Home,
    'All Products': ShoppingBag,
    'Why Us': HelpCircle,
    'About': Info,
    'My Orders': Package,
    'Admin': LayoutDashboard
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-[50] transition-all duration-500 w-full max-w-screen` +
      (isScrolled ? ' bg-white/80 backdrop-blur-md shadow-lg' : ' bg-green-100/70 backdrop-blur-sm')
    }>
      {/* Announcement Bar */}
      <div className={`relative overflow-hidden transition-all duration-300 w-full bg-gradient-to-r from-green-600 via-green-500 to-green-600 ${
        isScrolled ? 'max-h-0 opacity-0 md:max-h-none md:opacity-100' : 'max-h-8 md:max-h-12 opacity-100'
      }`}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(white_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </div>
        <p className="relative w-full text-center font-medium text-white px-2 py-0.5 md:py-1 lg:py-2 text-xs md:text-sm lg:text-base whitespace-normal break-words overflow-x-auto">
          🌿 Fresh Vegetables Harvested Today & Delivered Today! 
        </p>
      </div>

      {/* Mobile Menu */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 z-50 flex">
            <Transition.Child
              as={Fragment}
              enter="transform transition duration-300 ease-out"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition duration-300 ease-in"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-[85vw] max-w-[320px] flex-col bg-white shadow-2xl">
                {/* Header with Close Button */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">N</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">NaveDhana</h2>
                     
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
                  >
                    <X className="h-5 w-5 text-gray-600" />
                  </button>
                </div>

                {/* User Profile Section */}
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-b border-green-100">
                  {user ? (
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-xl">
                            {user?.user?.displayName ? user.user.displayName[0].toUpperCase() : 
                             user?.user?.email ? user.user.email[0].toUpperCase() : 'U'}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {user.user?.displayName || 'User'}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">
                          {user.user?.email}
                        </p>
                        <div className="flex items-center mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          <span className="text-xs text-green-600 font-medium">Online</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-3">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Welcome Guest</h3>
                      <button
                        onClick={() => { openAuthModal('login'); setOpen(false); }}
                        className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors duration-200 shadow-lg"
                      >
                        Sign In / Sign Up
                      </button>
                    </div>
                  )}
                </div>

                {/* Navigation Menu */}
                <div className="flex-1 overflow-y-auto py-6">
                  <nav className="space-y-2 px-4">
                    {navLinks.map((link) => {
                      const Icon = navIcons[link.name] || Home;
                      const isActive = location.pathname === link.path;
                      return (
                        <Link
                          key={link.path}
                          to={link.path}
                          className={`group flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                            isActive 
                              ? 'bg-green-100 text-green-700 shadow-sm border border-green-200' 
                              : 'text-gray-700 hover:bg-gray-50 hover:text-green-600'
                          }`}
                          onClick={() => setOpen(false)}
                        >
                          <div className={`p-2 rounded-lg transition-colors duration-200 ${
                            isActive ? 'bg-green-200' : 'bg-gray-100 group-hover:bg-green-100'
                          }`}>
                            <Icon className={`h-5 w-5 ${
                              isActive ? 'text-green-600' : 'text-gray-500 group-hover:text-green-600'
                            }`} />
                          </div>
                          <span className="font-medium">{link.name}</span>
                          {isActive && (
                            <div className="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </Link>
                      );
                    })}
                  </nav>

                  {/* Divider */}
                  <div className="my-6 mx-4 border-t border-gray-200"></div>

                  {/* Quick Actions */}
                  <div className="px-4 space-y-2">
                    {/* Cart */}
                    <Link
                      to="/cart"
                      className="group flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 hover:bg-green-50 transition-all duration-200"
                      onClick={() => setOpen(false)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-lg bg-white shadow-sm">
                          <ShoppingCart className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">Shopping Cart</span>
                          <p className="text-xs text-gray-500">
                            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                      </div>
                      {cartItems.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {cartItems.length}
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* Logout for logged in users */}
                    {user && (
                      <button
                        onClick={() => { logout(); setOpen(false); }}
                        className="w-full group flex items-center space-x-4 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 transition-all duration-200"
                      >
                        <div className="p-2 rounded-lg bg-red-100">
                          <LogOut className="h-5 w-5 text-red-600" />
                        </div>
                        <span className="font-medium text-red-700">Sign Out</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-2">© 2024 NaveDhana</p>
                    <div className="flex items-center justify-center space-x-4 text-xs">
                      <span className="text-gray-400">•</span>
                      <span className="text-green-600 font-medium">Fresh Vegetables</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-green-600 font-medium">Today Delivery</span>
                      <span className="text-gray-400">•</span>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop Navigation */}
      <nav className="mx-auto w-full max-w-7xl px-2 sm:px-4 lg:px-8">
        <div className="flex h-10 md:h-16 items-center justify-between w-full">
          {/* Mobile menu button */}
          <button
            type="button"
            className={`group relative rounded-full p-1.5 md:p-2 lg:hidden focus:outline-none`}
            onClick={() => setOpen(true)}
          >
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-green-600 to-green-400 opacity-0 blur transition-opacity duration-200 group-hover:opacity-20"></div>
            <div className="relative flex items-center justify-center w-4 h-4 md:w-6 md:h-6">
              <MenuIcon className="h-4 w-4 md:h-6 md:w-6 transform transition-transform duration-200 group-hover:scale-110" />
            </div>
          </button>

          {/* Logo */}
          <Link 
            to="/" 
            className="group flex items-center flex-shrink-0 transition-transform duration-200 hover:scale-105 min-w-0 max-w-full truncate"
          >
            <div className="relative min-w-0 max-w-full truncate">
              <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-green-600 to-green-400 opacity-20 blur group-hover:opacity-30 transition-opacity duration-200"></div>
              <h1 className={`relative text-lg md:text-2xl font-bold min-w-0 max-w-full truncate`}>
                NaveDhana
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex lg:items-center lg:space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative text-sm font-medium transition-all duration-200 group ${
                  location.pathname === link.path
                    ? 'text-green-600'
                    : 'text-gray-700 hover:text-green-600'
                }`}
              >
                {link.name}
                <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-green-600 transition-all duration-200 group-hover:w-full ${
                  location.pathname === link.path ? 'w-full' : ''
                }`}></span>
              </Link>
            ))}
          </div>

          {/* Right side buttons */}
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 max-w-full">
            {/* Cart - Hidden on mobile */}
            <Link
              to="/cart"
              className={`relative p-1.5 md:p-2 rounded-full transition-all duration-200 group hidden sm:block`}
            >
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-green-600 to-green-400 opacity-0 group-hover:opacity-20 transition-opacity duration-200 blur"></div>
              <ShoppingCart className="relative h-4 w-4 md:h-5 md:w-5" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 rounded-full bg-gradient-to-r from-green-600 to-green-400 text-white text-xs flex items-center justify-center shadow-lg transform transition-transform duration-200 group-hover:scale-110">
                  {cartItems.length}
                </span>
              )}
            </Link>

            {/* User Profile Dropdown or Login Button */}
            {user ? (
              <Menu as="div" className="relative">
                <Menu.Button className={`relative p-1.5 md:p-2 rounded-full transition-all duration-200 group`}>
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-green-600 to-green-400 opacity-0 group-hover:opacity-20 transition-opacity duration-200 blur"></div>
                  <User className="relative h-4 w-4 md:h-5 md:w-5" />
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className={`absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-green-100 focus:outline-none border border-green-50 backdrop-blur-sm overflow-hidden`}>
                    <div className="p-2">
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/profile"
                            className={`${
                              active 
                                ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-800'
                                : 'text-gray-700 hover:text-green-700 hover:bg-green-100'
                            } group flex w-full items-center px-3 py-2 text-sm transition-all duration-200 rounded-lg font-medium`}
                          >
                            <User className={`mr-3 h-4 w-4 ${active ? 'text-green-600' : 'text-gray-500'}`} />
                            Profile
                          </Link>
                        )}
                      </Menu.Item>
                      <div className="border-t border-green-50 my-1 mx-1"></div>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={logout}
                            className={`${
                              active 
                                ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-800'
                                : 'text-gray-700 hover:text-red-700 hover:bg-red-50'
                            } group flex w-full items-center px-3 py-2 text-sm transition-all duration-200 rounded-lg font-medium`}
                          >
                            <LogOut className={`mr-3 h-4 w-4 ${active ? 'text-red-600' : 'text-gray-500'}`} />
                            Logout
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className={`relative inline-flex items-center min-w-0 max-w-full px-2 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-all duration-200 group overflow-hidden truncate text-ellipsis whitespace-nowrap text-sm`}
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                <span className="relative flex items-center min-w-0 max-w-full truncate">
                  <User className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 min-w-0 max-w-full" />
                  Login
                </span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        closeModal={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </div>
  )
}
