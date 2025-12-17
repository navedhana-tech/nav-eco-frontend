import React from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';

const Overview = ({ setActiveTab }) => {
    return (
        <div className="p-6 bg-white rounded-2xl shadow-xl">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                Overview
            </h2>
            <div className="space-y-4">
                <div className="p-4 rounded-xl shadow bg-gradient-to-r from-blue-50 to-blue-100">
                    <h3 className="text-lg font-medium mb-2 text-gray-800">
                        Recent Activity
                    </h3>
                    <div className="text-gray-500 text-sm italic">No recent activity yet.</div>
                </div>
                <div className="p-4 rounded-xl shadow bg-gradient-to-r from-cyan-50 to-cyan-100">
                    <h3 className="text-lg font-medium mb-2 text-gray-800">
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Link to="/admin/addproduct" className="flex items-center p-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 shadow font-semibold">
                            <Plus className="w-5 h-5 mr-2" />
                            Add New Product
                        </Link>
                        <button className="flex items-center p-3 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 shadow font-semibold">
                            <FileSpreadsheet className="w-5 h-5 mr-2" />
                            Export Report
                        </button>
                        <button
                            className="flex items-center p-3 rounded-lg bg-cyan-400 text-white hover:bg-cyan-500 shadow font-semibold"
                            onClick={() => setActiveTab && setActiveTab('banners')}
                        >
                            <ImageIcon className="w-5 h-5 mr-2" />
                            Update Banners
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Overview; 