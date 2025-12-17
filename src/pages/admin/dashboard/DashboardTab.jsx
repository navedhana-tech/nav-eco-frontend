import React from 'react';
import Overview from './components/Overview';
import Products from './components/Products';
import Orders from './components/Orders';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Users from './components/Users';
import Inventory from './components/Inventory';

function DashboardTab({ activeTab, setActiveTab }) {
    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'products', label: 'Products' },
        { id: 'orders', label: 'Orders' },
        { id: 'users', label: 'Users' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'settings', label: 'Settings' },
        { id: 'inventory', label: 'Inventory' }
    ];
        
    return (
        <div className="container mx-auto px-4 py-6">
            {/* Tabs */}
            <div className="flex space-x-4 mb-6 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'bg-purple-100 text-purple-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'overview' && <Overview setActiveTab={setActiveTab} />}
                {activeTab === 'products' && <Products />}
                {activeTab === 'orders' && <Orders />}
                {activeTab === 'users' && <Users />}
                {activeTab === 'analytics' && <Analytics />}
                {activeTab === 'settings' && <Settings />}
                {activeTab === 'inventory' && <Inventory />}
            </div>
        </div>
    );
}

export default DashboardTab;