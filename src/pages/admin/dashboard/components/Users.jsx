import React, { useContext, useState, useEffect } from 'react';
import { 
    Search,
    ArrowUpDown,
    Users as UsersIcon,
    List,
    Grid3X3,
    Mail,
    Phone,
    MapPin,
    Eye,
    Pencil,
    FileText,
    MoreVertical,
    Filter,
    Ban,
    Trash2,
    UserCog,
    Calendar,
    ChevronDown,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Clock,
    Activity,
    ShoppingBag,
    Star,
    Target,
    BarChart3,
    PieChart,
    RefreshCw,
    Download,
    AlertCircle,
    CheckCircle,
    XCircle,
    X
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { fireDB } from '../../../../firebase/FirebaseConfig';
import { toast } from 'react-toastify';
import myContext from '../../../../context/data/myContext';

function Users() {
    const context = useContext(myContext);
    const { user, getUserData } = context;
    
    // Debug log to check if data is being received
    useEffect(() => {
        console.log('Users component mounted, user data:', user);
        console.log('User data length:', user?.length);
        
        // Call getUserData if user array is empty
        if ((!user || user.length === 0) && getUserData) {
            console.log('Calling getUserData...');
            getUserData();
        }
    }, [user, getUserData]);
    
    // View Mode State
    const [userViewMode, setUserViewMode] = useState('list'); // 'list' or 'card'
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserDetails, setShowUserDetails] = useState(false);
    const [analyticsView, setAnalyticsView] = useState('overview'); // 'overview', 'spending', 'pages', 'timeline'
    
    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
    const [customerTypeFilter, setCustomerTypeFilter] = useState('all'); // 'all', 'new', 'regular', 'vip'
    const [orderFilter, setOrderFilter] = useState('all'); // 'all', 'no-orders', 'has-orders'
    const [sortBy, setSortBy] = useState('name'); // 'name', 'date', 'orders', 'spent', 'visits'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
    const [showFilters, setShowFilters] = useState(false);

    // Block/Unblock User Function
    const toggleUserBlock = async (userId, currentStatus) => {
        try {
            const userRef = doc(fireDB, "users", userId);
            await updateDoc(userRef, {
                isActive: !currentStatus,
                lastUpdated: new Date().toLocaleString(),
                blockedAt: !currentStatus ? new Date().toLocaleString() : null
            });
            
            // Show success message
            toast.success(`User ${!currentStatus ? 'blocked' : 'unblocked'} successfully`);
            
            // Refresh user data
            getUserData();
        } catch (error) {
            console.error('Error toggling user status:', error);
            toast.error('Failed to update user status');
        }
    };

    // Filter and Search Logic
    const getFilteredAndSortedUsers = () => {
        let filteredUsers = [...user];

        // Search functionality
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filteredUsers = filteredUsers.filter(user => 
                user.name?.toLowerCase().includes(query) ||
                user.email?.toLowerCase().includes(query) ||
                user.phone?.toLowerCase().includes(query) ||
                user.address?.toLowerCase().includes(query) ||
                user.uid?.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filteredUsers = filteredUsers.filter(user => {
                if (statusFilter === 'active') return user.isActive !== false;
                if (statusFilter === 'inactive') return user.isActive === false;
                return true;
            });
        }

        // Customer type filter
        if (customerTypeFilter !== 'all') {
            filteredUsers = filteredUsers.filter(user => {
                const orderCount = user.totalOrders || 0;
                if (customerTypeFilter === 'new') return orderCount === 0;
                if (customerTypeFilter === 'regular') return orderCount > 0 && orderCount <= 5;
                if (customerTypeFilter === 'vip') return orderCount > 5;
                return true;
            });
        }

        // Order filter
        if (orderFilter !== 'all') {
            filteredUsers = filteredUsers.filter(user => {
                const orderCount = user.totalOrders || 0;
                if (orderFilter === 'no-orders') return orderCount === 0;
                if (orderFilter === 'has-orders') return orderCount > 0;
                return true;
            });
        }

        // Sorting
        filteredUsers.sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'name':
                    aValue = (a.name || '').toLowerCase();
                    bValue = (b.name || '').toLowerCase();
                    break;
                case 'date':
                    aValue = new Date(a.createdAt || a.date || 0);
                    bValue = new Date(b.createdAt || b.date || 0);
                    break;
                case 'orders':
                    aValue = a.totalOrders || 0;
                    bValue = b.totalOrders || 0;
                    break;
                case 'spent':
                    aValue = a.totalSpent || 0;
                    bValue = b.totalSpent || 0;
                    break;
                case 'visits':
                    aValue = a.pageVisits || 0;
                    bValue = b.pageVisits || 0;
                    break;
                default:
                    aValue = (a.name || '').toLowerCase();
                    bValue = (b.name || '').toLowerCase();
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filteredUsers;
    };

    const clearAllFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setCustomerTypeFilter('all');
        setOrderFilter('all');
        setSortBy('name');
        setSortOrder('asc');
    };

    const getActiveFiltersCount = () => {
        let count = 0;
        if (searchQuery.trim()) count++;
        if (statusFilter !== 'all') count++;
        if (customerTypeFilter !== 'all') count++;
        if (orderFilter !== 'all') count++;
        return count;
    };

    // Enhanced User Analytics Functions
    const getUserSpendingPattern = (userItem) => {
        const totalSpent = userItem.totalSpent || 0;
        const totalOrders = userItem.totalOrders || 0;
        const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
        
        return {
            totalSpent,
            totalOrders,
            avgOrderValue,
            spendingTrend: calculateSpendingTrend(userItem),
            lastOrderDate: userItem.lastOrderDate || 'No orders yet',
            spendingFrequency: calculateSpendingFrequency(userItem)
        };
    };

    const calculateSpendingTrend = (userItem) => {
        // This would ideally use historical data
        // For now, we'll use order count as a proxy
        const orders = userItem.totalOrders || 0;
        const visits = userItem.pageVisits || 0;
        const conversionRate = visits > 0 ? (orders / visits) * 100 : 0;
        
        if (conversionRate > 20) return 'increasing';
        if (conversionRate > 10) return 'stable';
        if (conversionRate > 5) return 'decreasing';
        return 'low';
    };

    const calculateSpendingFrequency = (userItem) => {
        const orders = userItem.totalOrders || 0;
        const joinDate = userItem.date || userItem.createdAt;
        
        if (!joinDate || orders === 0) return 'inactive';
        
        const daysSinceJoin = Math.floor((new Date() - new Date(joinDate)) / (1000 * 60 * 60 * 24));
        if (daysSinceJoin === 0) return 'new';
        
        const ordersPerMonth = (orders / daysSinceJoin) * 30;
        
        if (ordersPerMonth >= 4) return 'very_high';
        if (ordersPerMonth >= 2) return 'high';
        if (ordersPerMonth >= 1) return 'medium';
        if (ordersPerMonth >= 0.5) return 'low';
        return 'very_low';
    };

    const getPageVisitAnalytics = (userItem) => {
        const totalVisits = userItem.pageVisits || 0;
        const pageBreakdown = userItem.pageBreakdown || {
            home: 0,
            products: 0,
            cart: 0,
            checkout: 0,
            profile: 0,
            other: 0
        };
        
        return {
            totalVisits,
            pageBreakdown,
            mostVisitedPage: getMostVisitedPage(pageBreakdown),
            sessionDuration: userItem.avgSessionDuration || 0,
            bounceRate: calculateBounceRate(userItem)
        };
    };

    const getMostVisitedPage = (pageBreakdown) => {
        if (!pageBreakdown || Object.keys(pageBreakdown).length === 0) return 'unknown';
        
        return Object.entries(pageBreakdown).reduce((max, [page, visits]) => 
            visits > (pageBreakdown[max] || 0) ? page : max, 'home'
        );
    };

    const calculateBounceRate = (userItem) => {
        const totalVisits = userItem.pageVisits || 0;
        const singlePageVisits = userItem.singlePageVisits || 0;
        return totalVisits > 0 ? (singlePageVisits / totalVisits) * 100 : 0;
    };

    const getUserEngagementScore = (userItem) => {
        const visits = userItem.pageVisits || 0;
        const orders = userItem.totalOrders || 0;
        const spent = userItem.totalSpent || 0;
        const lastVisit = userItem.lastVisit;
        
        let score = 0;
        
        // Visit score (0-25 points)
        score += Math.min(visits * 2, 25);
        
        // Order score (0-30 points)
        score += Math.min(orders * 5, 30);
        
        // Spending score (0-25 points)
        score += Math.min(spent / 100, 25);
        
        // Recency score (0-20 points)
        if (lastVisit && lastVisit !== 'Never') {
            const daysSinceVisit = Math.floor((new Date() - new Date(lastVisit)) / (1000 * 60 * 60 * 24));
            if (daysSinceVisit <= 1) score += 20;
            else if (daysSinceVisit <= 7) score += 15;
            else if (daysSinceVisit <= 30) score += 10;
            else if (daysSinceVisit <= 90) score += 5;
        }
        
        return Math.min(Math.floor(score), 100);
    };

    const getEngagementLevel = (score) => {
        if (score >= 80) return { level: 'Champion', color: 'purple', icon: Star };
        if (score >= 60) return { level: 'Loyal', color: 'blue', icon: CheckCircle };
        if (score >= 40) return { level: 'Active', color: 'green', icon: Activity };
        if (score >= 20) return { level: 'Casual', color: 'yellow', icon: Clock };
        return { level: 'Inactive', color: 'red', icon: XCircle };
    };

    const exportUserAnalytics = () => {
        const analyticsData = getFilteredAndSortedUsers().map(userItem => ({
            name: userItem.name || 'Anonymous',
            email: userItem.email || 'N/A',
            totalSpent: userItem.totalSpent || 0,
            totalOrders: userItem.totalOrders || 0,
            pageVisits: userItem.pageVisits || 0,
            lastVisit: userItem.lastVisit || 'Never',
            engagementScore: getUserEngagementScore(userItem),
            customerType: (userItem.totalOrders || 0) > 5 ? 'VIP' : 
                         (userItem.totalOrders || 0) > 0 ? 'Regular' : 'New',
            joinDate: userItem.date || userItem.createdAt || 'N/A'
        }));
        
        const csvContent = [
            ['Name', 'Email', 'Total Spent', 'Total Orders', 'Page Visits', 'Last Visit', 'Engagement Score', 'Customer Type', 'Join Date'],
            ...analyticsData.map(row => Object.values(row))
        ].map(row => row.join(',')).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user_analytics_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast.success('User analytics exported successfully!');
    };

    const refreshUserAnalytics = async () => {
        toast.info('Refreshing user analytics...');
        await getUserData();
        toast.success('User analytics refreshed!');
    };

    const renderListView = () => (
        <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-100">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200"> 
                        <th className="p-4 font-semibold text-gray-700 text-left">User Info</th>
                        <th className="p-4 font-semibold text-gray-700 text-left">Contact</th>
                        <th className="p-4 font-semibold text-gray-700 text-left">Page Analytics</th>
                        <th className="p-4 font-semibold text-gray-700 text-left">Spending Pattern</th>
                        <th className="p-4 font-semibold text-gray-700 text-left">Engagement</th>
                        <th className="p-4 font-semibold text-gray-700 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {getFilteredAndSortedUsers().map((item, index) => {
                        const spendingPattern = getUserSpendingPattern(item);
                        const pageAnalytics = getPageVisitAnalytics(item);
                        const engagementScore = getUserEngagementScore(item);
                        const engagementLevel = getEngagementLevel(engagementScore);
                        
                        return (
                        <tr key={index} className={`border-b border-gray-100 hover:bg-indigo-50 transition-all duration-300 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}>
                            {/* User Info */}
                            <td className="p-4">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg mr-4">
                                        {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">{item.name || 'Anonymous User'}</div>
                                        <div className="text-xs text-gray-500">ID: {item.uid?.substring(0, 8)}...</div>
                                        <div className="text-xs text-gray-500">Joined: {item.date || 'N/A'}</div>
                                    </div>
                                </div>
                            </td>
                            
                            {/* Contact Info */}
                            <td className="p-4">
                                <div className="space-y-1">
                                    <div className="flex items-center text-gray-900">
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full mr-2">Email</span>
                                        {item.email || 'Not provided'}
                                    </div>
                                    <div className="flex items-center text-gray-900">
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full mr-2">Phone</span>
                                        {item.phone || 'Not provided'}
                                    </div>
                                    <div className="flex items-center text-gray-900">
                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full mr-2">Address</span>
                                        <span className="text-xs">
                                            {item.address ? 
                                                (item.address.length > 30 ? item.address.substring(0, 30) + '...' : item.address) 
                                                : 'Not provided'
                                            }
                                        </span>
                                    </div>
                                </div>
                            </td>
                            
                            {/* Page Analytics */}
                            <td className="p-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600">Total Visits:</span>
                                        <span className="font-semibold text-indigo-600">
                                            {pageAnalytics.totalVisits}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600">Top Page:</span>
                                        <span className="text-xs text-gray-500 capitalize">
                                            {pageAnalytics.mostVisitedPage}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600">Bounce Rate:</span>
                                        <span className="text-xs text-gray-500">
                                            {pageAnalytics.bounceRate.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div 
                                            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full" 
                                            style={{ width: `${Math.min((pageAnalytics.totalVisits || 0) * 5, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </td>
                            
                            {/* Spending Pattern */}
                            <td className="p-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600">Total Spent:</span>
                                        <span className="font-semibold text-green-600">
                                            ₹{spendingPattern.totalSpent}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600">Avg Order:</span>
                                        <span className="text-xs text-green-600">
                                            ₹{spendingPattern.avgOrderValue.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600">Frequency:</span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            spendingPattern.spendingFrequency === 'very_high' ? 'bg-purple-100 text-purple-700' :
                                            spendingPattern.spendingFrequency === 'high' ? 'bg-blue-100 text-blue-700' :
                                            spendingPattern.spendingFrequency === 'medium' ? 'bg-green-100 text-green-700' :
                                            spendingPattern.spendingFrequency === 'low' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {spendingPattern.spendingFrequency.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {spendingPattern.spendingTrend === 'increasing' && <TrendingUp className="w-3 h-3 text-green-500" />}
                                        {spendingPattern.spendingTrend === 'decreasing' && <TrendingDown className="w-3 h-3 text-red-500" />}
                                        {spendingPattern.spendingTrend === 'stable' && <Activity className="w-3 h-3 text-blue-500" />}
                                        <span className="text-xs text-gray-500 capitalize">
                                            {spendingPattern.spendingTrend}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            
                            {/* Engagement */}
                            <td className="p-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600">Score:</span>
                                        <span className="font-semibold text-indigo-600">
                                            {engagementScore}/100
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <engagementLevel.icon className={`w-4 h-4 text-${engagementLevel.color}-500`} />
                                        <span className={`text-xs px-2 py-1 rounded-full bg-${engagementLevel.color}-100 text-${engagementLevel.color}-700`}>
                                            {engagementLevel.level}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                        item.isActive !== false 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                    }`}>
                                        {item.isActive !== false ? 'Active' : 'Inactive'}
                                    </span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                        (item.totalOrders || 0) > 5 
                                                ? 'bg-purple-100 text-purple-800' 
                                            : (item.totalOrders || 0) > 0 
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                    }`}>
                                            {(item.totalOrders || 0) > 5 ? 'VIP' : 
                                             (item.totalOrders || 0) > 0 ? 'Regular' : 'New'}
                                    </span>
                                    </div>
                                </div>
                            </td>
                            
                            {/* Actions */}
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            setSelectedUser(item);
                                            setShowUserDetails(true);
                                        }}
                                        className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-all duration-300" 
                                        title="View Details"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button 
                                        className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-all duration-300" 
                                        title="Send Message"
                                    >
                                        <Mail className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => toggleUserBlock(item.id, item.isActive !== false)}
                                        className={`p-2 rounded-lg transition-all duration-300 ${
                                            item.isActive !== false
                                                ? 'bg-red-100 hover:bg-red-200 text-red-700'
                                                : 'bg-green-100 hover:bg-green-200 text-green-700'
                                        }`}
                                        title={item.isActive !== false ? 'Block User' : 'Unblock User'}
                                    >
                                        <Ban className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const renderCardView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getFilteredAndSortedUsers().map((item, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
                                {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="text-right">
                                <div className="text-xs opacity-80">Customer Type</div>
                                <div className="text-sm font-semibold">
                                    {(item.totalOrders || 0) > 5 ? 'VIP' : 
                                     (item.totalOrders || 0) > 0 ? 'Regular' : 'New'}
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-1">{item.name || 'Anonymous User'}</h3>
                            <p className="text-sm opacity-80">{item.email || 'No email'}</p>
                        </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 space-y-4">
                        {/* Contact Info */}
                        <div className="space-y-3">
                            <div className="flex items-center text-gray-700">
                                <Mail className="w-4 h-4 mr-3 text-blue-500" />
                                <span className="text-sm truncate">{item.email || 'Not provided'}</span>
                            </div>
                            <div className="flex items-center text-gray-700">
                                <Phone className="w-4 h-4 mr-3 text-green-500" />
                                <span className="text-sm">{item.phone || 'Not provided'}</span>
                            </div>
                            <div className="flex items-start text-gray-700">
                                <MapPin className="w-4 h-4 mr-3 text-orange-500 mt-0.5" />
                                <span className="text-sm line-clamp-2">
                                    {item.address || 'Not provided'}
                                </span>
                            </div>
                        </div>

                        {/* Activity Stats */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                            <div className="text-center">
                                <div className="flex items-center justify-center mb-1">
                                    <Eye className="w-4 h-4 text-indigo-500 mr-1" />
                                    <span className="text-xs text-gray-600">Visits</span>
                                </div>
                                <div className="text-lg font-bold text-indigo-600">{item.pageVisits || 0}</div>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center mb-1">
                                    <FileText className="w-4 h-4 text-green-500 mr-1" />
                                    <span className="text-xs text-gray-600">Orders</span>
                                </div>
                                <div className="text-lg font-bold text-green-600">{item.totalOrders || 0}</div>
                            </div>
                        </div>

                        {/* Progress Bars */}
                        <div className="space-y-2">
                            <div>
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Activity</span>
                                    <span>{Math.min((item.pageVisits || 0) * 10, 100)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full" 
                                        style={{ width: `${Math.min((item.pageVisits || 0) * 10, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Orders</span>
                                    <span>{Math.min((item.totalOrders || 0) * 20, 100)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-300" 
                                        style={{ width: `${Math.min((item.totalOrders || 0) * 20, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Status and Actions */}
                        <div className="pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                    item.isActive !== false 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {item.isActive !== false ? 'Active' : 'Blocked'}
                                </span>
                                <span className="text-sm font-semibold text-green-600">
                                    ₹{item.totalSpent || 0}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    className="flex-1 p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-all duration-300 text-xs font-medium" 
                                    title="View Details"
                                >
                                    <Eye className="w-4 h-4 mx-auto" />
                                </button>
                                <button 
                                    className="flex-1 p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-all duration-300 text-xs font-medium" 
                                    title="Send Message"
                                >
                                    <Mail className="w-4 h-4 mx-auto" />
                                </button>
                                <button 
                                    onClick={() => toggleUserBlock(item.id, item.isActive !== false)}
                                    className={`flex-1 p-2 rounded-lg transition-all duration-300 text-xs font-medium ${
                                        item.isActive !== false
                                            ? 'bg-red-100 hover:bg-red-200 text-red-700'
                                            : 'bg-green-100 hover:bg-green-200 text-green-700'
                                    }`}
                                    title={item.isActive !== false ? 'Block User' : 'Unblock User'}
                                >
                                    <Ban className="w-4 h-4 mx-auto" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="p-6 bg-white rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800">User Analytics Dashboard</h2>
                    <p className="text-gray-600 mt-1">Track spending patterns and page analytics</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={refreshUserAnalytics}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all duration-300"
                        title="Refresh Analytics"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span className="text-sm font-medium">Refresh</span>
                    </button>
                    <button
                        onClick={exportUserAnalytics}
                        className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl transition-all duration-300"
                        title="Export Analytics"
                    >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">Export</span>
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-blue-700">Total: {user.length}</span>
                    </div>
                </div>
            </div>

            {/* Analytics Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-700 font-medium">Total Revenue</p>
                            <p className="text-2xl font-bold text-blue-900">
                                ₹{getFilteredAndSortedUsers().reduce((sum, user) => sum + (user.totalSpent || 0), 0).toFixed(2)}
                            </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-700 font-medium">Total Orders</p>
                            <p className="text-2xl font-bold text-green-900">
                                {getFilteredAndSortedUsers().reduce((sum, user) => sum + (user.totalOrders || 0), 0)}
                            </p>
                        </div>
                        <ShoppingBag className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-700 font-medium">Page Views</p>
                            <p className="text-2xl font-bold text-purple-900">
                                {getFilteredAndSortedUsers().reduce((sum, user) => sum + (user.pageVisits || 0), 0)}
                            </p>
                        </div>
                        <Eye className="w-8 h-8 text-purple-500" />
                    </div>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-orange-700 font-medium">Avg Engagement</p>
                            <p className="text-2xl font-bold text-orange-900">
                                {getFilteredAndSortedUsers().length > 0 ? 
                                    (getFilteredAndSortedUsers().reduce((sum, user) => sum + getUserEngagementScore(user), 0) / getFilteredAndSortedUsers().length).toFixed(1) : 0
                                }%
                            </p>
                        </div>
                        <Target className="w-8 h-8 text-orange-500" />
                    </div>
                </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="space-y-4 mb-6">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search users by name, email, phone, address..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-gray-50 text-gray-900 placeholder-gray-500 transition-all duration-300"
                        />
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-3 rounded-xl border-2 transition-all duration-300 flex items-center gap-2 ${
                            showFilters 
                                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <ArrowUpDown className="w-5 h-5" />
                        Filters
                        {getActiveFiltersCount() > 0 && (
                            <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {getActiveFiltersCount()}
                            </span>
                        )}
                    </button>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                        <button
                            onClick={() => setUserViewMode('list')}
                            className={`p-2 rounded-lg transition-all duration-300 ${
                                userViewMode === 'list' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                            title="List View"
                        >
                            <List className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setUserViewMode('card')}
                            className={`p-2 rounded-lg transition-all duration-300 ${
                                userViewMode === 'card' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                            title="Card View"
                        >
                            <Grid3X3 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Status Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-gray-900 transition-all duration-300"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            {/* Customer Type Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Type</label>
                                <select
                                    value={customerTypeFilter}
                                    onChange={(e) => setCustomerTypeFilter(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-gray-900 transition-all duration-300"
                                >
                                    <option value="all">All Types</option>
                                    <option value="new">New Customers</option>
                                    <option value="regular">Regular Customers</option>
                                    <option value="vip">VIP Customers</option>
                                </select>
                            </div>

                            {/* Order Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Orders</label>
                                <select
                                    value={orderFilter}
                                    onChange={(e) => setOrderFilter(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-gray-900 transition-all duration-300"
                                >
                                    <option value="all">All Orders</option>
                                    <option value="no-orders">No Orders</option>
                                    <option value="has-orders">Has Orders</option>
                                </select>
                            </div>

                            {/* Sort Options */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-gray-900 transition-all duration-300"
                                >
                                    <option value="name">Name</option>
                                    <option value="date">Join Date</option>
                                    <option value="orders">Total Orders</option>
                                    <option value="spent">Total Spent</option>
                                    <option value="visits">Page Visits</option>
                                </select>
                            </div>
                        </div>

                        {/* Sort Order and Clear Filters */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="radio"
                                        name="sortOrder"
                                        value="asc"
                                        checked={sortOrder === 'asc'}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    Ascending
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="radio"
                                        name="sortOrder"
                                        value="desc"
                                        checked={sortOrder === 'desc'}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    Descending
                                </label>
                            </div>
                            <button
                                onClick={clearAllFilters}
                                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Results Summary */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-4">
                        <span>Showing {getFilteredAndSortedUsers().length} of {user.length} users</span>
                        {getActiveFiltersCount() > 0 && (
                            <span className="text-blue-600 font-medium">
                                {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} active
                            </span>
                        )}
                    </div>
                    {searchQuery.trim() && (
                        <span className="text-gray-500">
                            Search results for: "{searchQuery}"
                        </span>
                    )}
                </div>
            </div>

            {/* User List/Grid View */}
            {userViewMode === 'list' ? renderListView() : renderCardView()}

            {/* Empty State */}
            {getFilteredAndSortedUsers().length === 0 && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UsersIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    {user.length === 0 ? (
                        <>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                            <p className="text-gray-500">Users will appear here once they register on your platform.</p>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                            <p className="text-gray-500 mb-4">
                                No users match your current search and filter criteria.
                            </p>
                            <button
                                onClick={clearAllFilters}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300"
                            >
                                Clear All Filters
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Detailed User Analytics Modal */}
            {showUserDetails && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">User Analytics</h3>
                                    <p className="text-gray-600">{selectedUser.name || 'Anonymous User'}</p>
                                </div>
                                <button
                                    onClick={() => setShowUserDetails(false)}
                                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all duration-300"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            {/* Analytics Navigation */}
                            <div className="flex space-x-4 mb-6 overflow-x-auto">
                                {[
                                    { id: 'overview', label: 'Overview', icon: Eye },
                                    { id: 'spending', label: 'Spending', icon: DollarSign },
                                    { id: 'pages', label: 'Page Analytics', icon: BarChart3 },
                                    { id: 'timeline', label: 'Timeline', icon: Clock }
                                ].map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setAnalyticsView(tab.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
                                                analyticsView === tab.id
                                                    ? 'bg-blue-100 text-blue-700 font-medium'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Analytics Content */}
                            {analyticsView === 'overview' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-gray-50 p-4 rounded-xl">
                                            <h4 className="font-semibold text-gray-800 mb-3">Basic Information</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Name:</span>
                                                    <span className="font-medium">{selectedUser.name || 'Not provided'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Email:</span>
                                                    <span className="font-medium">{selectedUser.email || 'Not provided'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Phone:</span>
                                                    <span className="font-medium">{selectedUser.phone || 'Not provided'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Joined:</span>
                                                    <span className="font-medium">{selectedUser.date || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gray-50 p-4 rounded-xl">
                                            <h4 className="font-semibold text-gray-800 mb-3">Engagement Score</h4>
                                            <div className="text-center">
                                                <div className="text-4xl font-bold text-blue-600 mb-2">
                                                    {getUserEngagementScore(selectedUser)}/100
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {getEngagementLevel(getUserEngagementScore(selectedUser)).level}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {analyticsView === 'spending' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-green-50 p-4 rounded-xl text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                ₹{getUserSpendingPattern(selectedUser).totalSpent}
                                            </div>
                                            <div className="text-sm text-green-700">Total Spent</div>
                                        </div>
                                        <div className="bg-blue-50 p-4 rounded-xl text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {getUserSpendingPattern(selectedUser).totalOrders}
                                            </div>
                                            <div className="text-sm text-blue-700">Total Orders</div>
                                        </div>
                                        <div className="bg-purple-50 p-4 rounded-xl text-center">
                                            <div className="text-2xl font-bold text-purple-600">
                                                ₹{getUserSpendingPattern(selectedUser).avgOrderValue.toFixed(2)}
                                            </div>
                                            <div className="text-sm text-purple-700">Average Order</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {analyticsView === 'pages' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-gray-50 p-4 rounded-xl">
                                            <h4 className="font-semibold text-gray-800 mb-3">Page Visits</h4>
                                            <div className="space-y-2">
                                                {Object.entries(getPageVisitAnalytics(selectedUser).pageBreakdown).map(([page, visits]) => (
                                                    <div key={page} className="flex justify-between items-center">
                                                        <span className="text-gray-600 capitalize">{page}:</span>
                                                        <span className="font-medium">{visits}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gray-50 p-4 rounded-xl">
                                            <h4 className="font-semibold text-gray-800 mb-3">Analytics</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Total Visits:</span>
                                                    <span className="font-medium">{getPageVisitAnalytics(selectedUser).totalVisits}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Bounce Rate:</span>
                                                    <span className="font-medium">{getPageVisitAnalytics(selectedUser).bounceRate.toFixed(1)}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Top Page:</span>
                                                    <span className="font-medium capitalize">{getPageVisitAnalytics(selectedUser).mostVisitedPage}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {analyticsView === 'timeline' && (
                                <div className="space-y-6">
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <h4 className="font-semibold text-gray-800 mb-3">Activity Timeline</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <Calendar className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">Account Created</div>
                                                    <div className="text-sm text-gray-500">{selectedUser.date || 'N/A'}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                    <Eye className="w-4 h-4 text-green-600" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">Last Visit</div>
                                                    <div className="text-sm text-gray-500">{selectedUser.lastVisit || 'Never'}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <ShoppingBag className="w-4 h-4 text-purple-600" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">Last Order</div>
                                                    <div className="text-sm text-gray-500">{selectedUser.lastOrderDate || 'No orders yet'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Users; 