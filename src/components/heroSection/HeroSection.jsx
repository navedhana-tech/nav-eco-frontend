import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import myContext from '../../context/data/myContext';
import './HeroSection.css';
import { useNavigate } from '@tanstack/react-router';

function HeroSection() {
  const context = useContext(myContext);
  const { mode, searchkey, setSearchkey, product } = context;
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const navigate = useNavigate();
  const searchRef = React.useRef(null);

  // Close suggestions when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchkey.trim()) {
      window.location.href = '/allproducts';
      setShowSuggestions(false);
    } else {
      setShowSuggestions(true);
    }
  };
  const clearSearch = () => {
    setSearchkey('');
    setShowSuggestions(false);
  };

  // Filtered suggestions
  const suggestions = searchkey.trim()
    ? product.filter(p =>
        p.title.toLowerCase().includes(searchkey.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <div className="min-h-[45vh] sm:min-h-[60vh] flex flex-col items-center justify-center relative overflow-hidden px-4 sm:px-6 py-4 sm:py-12 pt-8 sm:pt-12" style={{background: 'linear-gradient(120deg, #ffb6d5 0%, #b2f7cc 60%, #a5b4fc 100%)'}}>
      {/* Stronger pattern overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{background: 'radial-gradient(circle at 20% 40%, #fff0f6 20%, transparent 70%), radial-gradient(circle at 80% 60%, #e0f2fe 20%, transparent 80%)'}} />
          <motion.div
        initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
        className="w-full max-w-2xl mx-auto text-center relative z-10"
      >
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-2 sm:mb-4 bg-gradient-to-r from-pink-500 via-green-500 to-blue-500 bg-clip-text text-transparent drop-shadow-lg leading-tight">
          Freshness Delivered, <span className="text-pink-600 block sm:inline">Every Day</span>
              </h1>
        <p className="text-sm sm:text-lg md:text-xl text-gray-700 mb-4 sm:mb-8 font-medium px-2 sm:px-0 leading-relaxed">
          Empowering farmers. Search and order farm-fresh vegetables and leafy greens online, delivered to your doorstep with fast home delivery.
        </p>
        <div className="mb-6 max-w-md mx-auto relative px-2 sm:px-0" ref={searchRef}>
          <div className="relative rounded-full bg-white shadow-lg border border-gray-200 flex items-center">
            <Search className="absolute left-3 sm:left-4 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchkey}
              onChange={(e) => { setSearchkey(e.target.value); setShowSuggestions(true); }}
              onKeyUp={handleSearch}
                  placeholder="Search vegetables..."
              className="block w-full pl-10 sm:pl-12 pr-8 sm:pr-10 py-2.5 sm:py-3 rounded-full text-sm sm:text-base outline-none bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-pink-200"
              autoComplete="off"
              onFocus={() => setShowSuggestions(true)}
            />
            {searchkey && (
              <button onClick={clearSearch} className="absolute right-2 sm:right-3 text-gray-400 hover:text-pink-500 touch-manipulation">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
              </div>
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <>
              {/* Mobile backdrop overlay */}
              <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" onClick={() => setShowSuggestions(false)} />
              <div className="absolute left-2 right-2 sm:left-0 sm:right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-64 sm:max-h-72 overflow-y-auto">
              {suggestions.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-green-50 cursor-pointer transition-all border-b last:border-b-0 touch-manipulation"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate({ to: `/productinfo/${item.id}` });
                    setShowSuggestions(false);
                  }}
                >
                  <img src={item.imageUrl} alt={item.title} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate text-sm sm:text-base">{item.title}</div>
                    <div className="text-xs text-gray-500 truncate">{item.category}</div>
                  </div>
                  <div className="font-bold text-green-600 text-sm flex-shrink-0">₹{item.price}</div>
                </div>
              ))}
            </div>
            </>
          )}
            </div>
          </motion.div>
      {/* Scrolling Notice Banner */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 text-black py-2 sm:py-2.5 z-20 shadow-md flex items-center">
        <div className="bg-red-600 text-white px-3 sm:px-4 py-1 sm:py-1.5 font-bold text-xs sm:text-sm whitespace-nowrap flex-shrink-0 z-30">
          IMPORTANT
        </div>
        <div className="scrolling-text-container flex-1 overflow-hidden">
          <div className="scrolling-text text-xs sm:text-sm font-medium px-4 text-black">
            Please note: Vegetable and leafy green prices are calculated using yesterday's market rates. Final prices on the delivery date may differ due to daily market changes. • Please note: Vegetable and leafy green prices are calculated using yesterday's market rates. Final prices on the delivery date may differ due to daily market changes. • Please note: Vegetable and leafy green prices are calculated using yesterday's market rates. Final prices on the delivery date may differ due to daily market changes.
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;
