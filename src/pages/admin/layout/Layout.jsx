import React from 'react';
import { Link } from '@tanstack/react-router';
import { MapPin } from 'lucide-react';

const Layout = () => {
  return (
    <div>
      {/* ... existing code ... */}
      <Link
        to="/admin/delivery"
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 font-semibold text-base ${
            isActive ? 'bg-green-100 text-green-700' : 'hover:bg-green-50 text-gray-700 hover:text-green-700'
          }`
        }
      >
        <span className="inline-block w-5 h-5"><MapPin /></span>
        Delivery Dashboard
      </Link>
      {/* ... existing code ... */}
    </div>
  );
};

export default Layout; 