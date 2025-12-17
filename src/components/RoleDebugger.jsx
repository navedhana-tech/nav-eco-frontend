import React, { useEffect, useState } from 'react';
import { Shield, Bug, RefreshCw } from 'lucide-react';

const RoleDebugger = () => {
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);
  
  const refreshData = () => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const currentRole = localStorage.getItem('userRole');
    setUser(currentUser);
    setRole(currentRole);
  };
  
  useEffect(() => {
    refreshData();
    
    // Listen for localStorage changes
    const handleStorageChange = () => {
      refreshData();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Check for changes periodically
    const interval = setInterval(refreshData, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  if (!user) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-lg shadow-lg border border-gray-600 max-w-xs z-50">
      <div className="flex items-center gap-2 mb-2">
        <Bug className="w-4 h-4" />
        <span className="text-sm font-semibold">Role Debug</span>
        <button
          onClick={refreshData}
          className="ml-auto p-1 hover:bg-gray-700 rounded"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
      
      <div className="text-xs space-y-1">
        <div>
          <span className="text-gray-400">Email:</span> {user.user?.email}
        </div>
        <div>
          <span className="text-gray-400">Role:</span> 
          <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
            role === 'master_admin' ? 'bg-red-600' :
            role === 'sub_admin' ? 'bg-blue-600' :
            role === 'delivery_boy' ? 'bg-green-600' :
            'bg-gray-600'
          }`}>
            {role || 'none'}
          </span>
        </div>
      </div>
      
      <div className="mt-2 space-y-1">
        <button
          onClick={() => window.debugAdminData()}
          className="w-full text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
        >
          Debug Admin Data
        </button>
        <button
          onClick={() => window.checkAuthState()}
          className="w-full text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded"
        >
          Check Auth State
        </button>
      </div>
    </div>
  );
};

export default RoleDebugger; 