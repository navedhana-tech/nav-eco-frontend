import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { getDocs, collection } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  TrendingUp,
  Settings,
  LogOut,
  Plus,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Menu,
  X,
  Home,
  Shield,
  ArrowLeft,
  FileText
} from 'lucide-react';
import myContext from '../../../context/data/myContext';
import { fireDB } from '../../../firebase/FirebaseConfig';
import DashboardTab from './DashboardTab';
import UpdateBanners from '../pages/UpdateBanners';
import AddProduct from '../pages/AddProduct';
import DeliveryDashboard from '../delivery/DeliveryDashboard';
import AdminManagement from '../../../components/AdminManagement';
import Inventory from './components/Inventory';
import Orders from './components/Orders';
import Invoice from './components/Invoice';
function Dashboard() {
    const context = useContext(myContext);
    const { mode } = context;
    const navigate = useNavigate();

    // Get current user role - synchronous version for immediate use
    const getCurrentUserRole = () => {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (!currentUser) return null;
        
        // Check if master admin
        if (currentUser.user?.email === 'omprakash16003@gmail.com') {
            return 'master_admin';
        }
        
        // Check stored role or default to user
        return localStorage.getItem('userRole') || 'user';
    };

    // Set default tab based on user role
    const getDefaultTab = () => {
        const role = getCurrentUserRole();
        return role === 'delivery_boy' ? 'delivery' : 'overview';
    };

    const [productCount, setProductCount] = useState(0);
    const [orderCount, setOrderCount] = useState(0);
    const [userCount, setUserCount] = useState(0);
    const [activeTab, setActiveTab] = useState(getDefaultTab());
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
    const [isMobile, setIsMobile] = useState(false);

    // Check screen size on mount and resize
    useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            setIsMobile(width < 1024); // lg breakpoint
            if (width >= 1024) {
                setSidebarOpen(true); // Auto-open on desktop
            } else {
                setSidebarOpen(false); // Auto-close on mobile/tablet
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const productsSnapshot = await getDocs(collection(fireDB, 'products'));
                setProductCount(productsSnapshot.size);

                const ordersSnapshot = await getDocs(collection(fireDB, 'orders'));
                setOrderCount(ordersSnapshot.size);

                const usersSnapshot = await getDocs(collection(fireDB, 'users'));
                setUserCount(usersSnapshot.size);

                // Calculate total revenue from orders (excluding cancelled orders)
                let revenue = 0;
                ordersSnapshot.forEach(doc => {
                    const orderData = doc.data();
                    if (orderData.totalAmount && orderData.status !== 'cancelled') {
                        revenue += parseFloat(orderData.totalAmount);
                    }
                });
                setTotalRevenue(revenue);
            } catch (error) {
                console.error("Error fetching counts:", error);
            }
        };

        fetchCounts();
    }, []);

    const handleLogout = () => {
        localStorage.clear('user');
        localStorage.removeItem('userRole');
        navigate({ to: '/' });
    };

    const closeSidebar = () => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    const userRole = getCurrentUserRole();

    // Define menu items based on user role
    const getMenuItemsForRole = () => {
        if (userRole === 'delivery_boy') {
            // Delivery boys only get access to delivery, inventory, and orders
            return [
                { id: 'delivery', label: 'Delivery Dashboard', icon: MapPin },
                { id: 'inventory', label: 'Inventory', icon: Package },
                { id: 'orders', label: 'Orders', icon: ShoppingCart },
            ];
        }
        
        // Admin users (master and sub admin) get full access
        return [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'products', label: 'Products', icon: Package },
        { id: 'orders', label: 'Orders', icon: ShoppingCart },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'delivery', label: 'Delivery Dashboard', icon: MapPin },
        { id: 'invoice', label: 'Invoices', icon: FileText },
            // Admin management only for master and sub admins
            ...(userRole === 'master_admin' || userRole === 'sub_admin' ? [{ id: 'admin_management', label: 'Admin Management', icon: Shield }] : []),
        { id: 'addproduct', label: 'Add Product', icon: Plus },
        { id: 'banners', label: 'Update Banners', icon: ImageIcon },
    ];
    };

    const menuItems = getMenuItemsForRole();

    const renderContent = () => {
        // For delivery boys, render components directly without horizontal tabs
        if (userRole === 'delivery_boy') {
            switch (activeTab) {
                case 'delivery':
                    return <DeliveryDashboard />;
                case 'inventory':
                    return <Inventory />;
                case 'orders':
                    return <Orders />;
                default:
                    return <DeliveryDashboard />;
            }
        }
        
        // For admin users, use the full dashboard with tabs
        switch (activeTab) {
            case 'delivery':
                return <DeliveryDashboard />;
            case 'addproduct':
                return <AddProduct />;
            case 'banners':
                return <UpdateBanners />;
            case 'admin_management':
                return <AdminManagement />;
            case 'invoice':
                return <Invoice />;
            default:
                return <DashboardTab activeTab={activeTab} setActiveTab={setActiveTab} />;
        }
    };

    return (
        <div className={`flex h-screen ${userRole === 'delivery_boy' && isMobile 
            ? 'bg-gray-50' 
            : 'bg-gradient-to-br from-blue-50 to-blue-100'
        } overflow-hidden`}>
            {/* Mobile Overlay */}
            {isMobile && sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden touch-none"
                    onClick={closeSidebar}
                    onTouchStart={closeSidebar}
                    aria-label="Close sidebar overlay"
                />
            )}

            {/* Sidebar - Responsive */}
            <div className={`
                fixed top-0 left-0 h-screen bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 shadow-2xl 
                border-r-4 border-blue-300 z-50 transition-all duration-300 ease-in-out
                ${userRole === 'delivery_boy' && isMobile ? 'hidden' : ''}
                ${sidebarOpen 
                    ? 'w-64 sm:w-72 lg:w-64' 
                    : 'w-0 lg:w-20'
                }
                ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
                lg:translate-x-0
                overflow-hidden
            `}>
                <div className="flex flex-col h-full">
                    {/* Mobile Header */}
                    <div className="lg:hidden flex items-center justify-between p-3 sm:p-4 border-b border-blue-500">
                        <div className="flex items-center gap-2 min-w-0">
                            <img src="/logo.png" alt="NaveDhana Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow border border-white flex-shrink-0" />
                        <h1 className="text-sm sm:text-base font-semibold text-white tracking-wide drop-shadow truncate">
                            {userRole === 'delivery_boy' ? 'NaveDhana Delivery' : 'NaveDhana Admin'}
                        </h1>
                        </div>
                    <button
                            onClick={closeSidebar}
                            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors flex-shrink-0 touch-manipulation"
                            aria-label="Close sidebar"
                    >
                            <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </button>
                    </div>

                    {/* Desktop Header */}
                    <div className="hidden lg:block">
                    <div className={`p-4 flex ${sidebarOpen ? 'flex-row items-center justify-start gap-2' : 'flex-col items-center'} border-b border-blue-500`}>
                        <img src="/logo.png" alt="NaveDhana Logo" className="w-12 h-12 rounded-xl shadow border-2 border-white" />
                        {sidebarOpen && (
                            <h1 className="text-xs font-semibold text-white tracking-wide drop-shadow ml-2">
                                {userRole === 'delivery_boy' ? 'NaveDhana Delivery' : 'NaveDhana Admin'}
                            </h1>
                        )}
                    </div>
                    </div>

                    {/* Navigation */}
                    <nav className={`flex-1 p-3 sm:p-4 space-y-2 overflow-y-auto overscroll-contain ${sidebarOpen ? '' : 'lg:flex lg:flex-col lg:items-center'}`} style={{ WebkitOverflowScrolling: 'touch' }}>
                        {/* Main Navigation Items */}
                        {menuItems.map((item, idx) => {
                            if (item.id === 'addproduct' || item.id === 'banners') return null;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        closeSidebar(); // Close sidebar on mobile after selection
                                    }}
                                    className={`
                                        flex items-center transition-all text-sm font-medium gap-3 shadow-sm touch-manipulation
                                        ${sidebarOpen 
                                            ? 'w-full px-3 sm:px-4 py-2.5 sm:py-3' 
                                            : 'lg:justify-center lg:w-12 lg:h-12 lg:my-2'
                                        } 
                                        rounded-xl
                                        ${activeTab === item.id
                                            ? 'bg-white text-blue-700 shadow-lg border-l-4 sm:border-l-8 border-blue-400 ring-2 ring-blue-200'
                                            : 'text-white hover:bg-blue-500 hover:shadow-md hover:border-l-4 sm:hover:border-l-8 hover:border-blue-300 active:bg-blue-600'
                                        }
                                    `}
                                    title={!sidebarOpen ? item.label : ''}
                                    style={{ minHeight: 44 }}
                                >
                                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                                    {sidebarOpen && <span className="ml-2 text-xs sm:text-sm font-semibold truncate">{item.label}</span>}
                                </button>
                            );
                        })}

                        {/* Actions Section Header */}
                        {sidebarOpen && (
                            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 text-xs font-bold text-blue-200 tracking-widest uppercase">
                                Actions
                            </div>
                        )}

                        {/* Action Items */}
                        {menuItems.filter(i => i.id === 'addproduct' || i.id === 'banners').map(item => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        closeSidebar();
                                    }}
                                    className={`
                                        flex items-center transition-all text-sm font-medium gap-3 shadow-sm touch-manipulation
                                        ${sidebarOpen 
                                            ? 'w-full px-3 sm:px-4 py-2.5 sm:py-3' 
                                            : 'lg:justify-center lg:w-12 lg:h-12 lg:my-2'
                                        } 
                                        rounded-xl
                                        ${activeTab === item.id
                                            ? 'bg-white text-blue-700 shadow-lg border-l-4 sm:border-l-8 border-blue-400 ring-2 ring-blue-200'
                                            : 'text-white hover:bg-blue-500 hover:shadow-md hover:border-l-4 sm:hover:border-l-8 hover:border-blue-300 active:bg-blue-600'
                                        }
                                    `}
                                    title={!sidebarOpen ? item.label : ''}
                                    style={{ minHeight: 44 }}
                                >
                                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                                    {sidebarOpen && <span className="ml-2 text-xs sm:text-sm font-semibold truncate">{item.label}</span>}
                                </button>
                            );
                        })}

                        {/* Separator */}
                        <div className={`border-t border-blue-500 my-3 sm:my-4 ${sidebarOpen ? 'mx-3 sm:mx-4' : 'lg:w-8'}`}></div>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className={`
                                flex items-center transition-all text-sm font-medium gap-3 shadow-sm text-white hover:bg-red-500 active:bg-red-600 touch-manipulation
                                ${sidebarOpen 
                                    ? 'w-full px-3 sm:px-4 py-2.5 sm:py-3' 
                                    : 'lg:justify-center lg:w-12 lg:h-12 lg:my-2'
                                } 
                                rounded-xl
                            `}
                            title={!sidebarOpen ? 'Logout' : ''}
                            style={{ minHeight: 44 }}
                        >
                            <LogOut className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                            {sidebarOpen && <span className="ml-2 text-xs sm:text-sm font-semibold">Logout</span>}
                        </button>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className={`
                flex-1 overflow-auto transition-all duration-300 ease-in-out
                ${userRole === 'delivery_boy' && isMobile 
                    ? 'ml-0' 
                    : sidebarOpen 
                    ? 'lg:ml-64' 
                    : 'lg:ml-20'
                }
                w-full
            `}>
                {/* Mobile Header */}
                <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
                    {userRole === 'delivery_boy' ? (
                        // Delivery Boy Mobile Header
                        <div className="p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <img src="/logo.png" alt="NaveDhana Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow flex-shrink-0" />
                                    <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">NaveDhana Delivery</h1>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-lg bg-red-100 hover:bg-red-200 active:bg-red-300 transition-colors touch-manipulation flex-shrink-0"
                                    title="Logout"
                                    aria-label="Logout"
                                >
                                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                                </button>
                            </div>
                            {/* Mobile Tab Navigation for Delivery Boy */}
                            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
                                {menuItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`
                                                flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-md transition-all touch-manipulation min-w-0
                                                ${activeTab === item.id
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                                                }
                                            `}
                                        >
                                            <Icon className="w-5 h-5 flex-shrink-0" />
                                            <span className="text-xs font-medium leading-none truncate w-full text-center">{item.label.split(' ')[0]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        // Admin Mobile Header
                        <div className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation flex-shrink-0"
                                aria-label="Open menu"
                            >
                                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </button>
                            <div className="flex items-center gap-2 min-w-0">
                                <img src="/logo.png" alt="NaveDhana Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow flex-shrink-0" />
                                <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">NaveDhana Admin</h1>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate({ to: '/' })}
                            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation flex-shrink-0"
                            title="Go to Home"
                            aria-label="Go to Home"
                        >
                            <Home className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                        </button>
                    </div>
                        </div>
                    )}
                </div>

                {/* Desktop Toggle Button */}
                <div className="hidden lg:block">
                    <button
                        className={`
                            fixed z-40 left-0 top-6 bg-blue-700 border-2 border-blue-400 rounded-full p-1.5 sm:p-2 shadow-lg 
                            transition-all duration-300 hover:bg-blue-600 active:bg-blue-800 cursor-pointer
                            ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}
                        `}
                        onClick={() => setSidebarOpen((prev) => !prev)}
                        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        {sidebarOpen ? <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                    </button>
                </div>

                {/* Content Area */}
                <div className={`${userRole === 'delivery_boy' && isMobile ? 'p-2' : 'p-4 lg:p-8'}`}>
                    {/* Back Button */}
                    <button
                        onClick={() => navigate({ to: '/' })}
                        className="mb-4 lg:mb-6 flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-gray-300"
                        title="Go to Home"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Back to Home</span>
                    </button>
                    {/* Stats Grid - Only show for admin users */}
                    {userRole !== 'delivery_boy' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 mb-6 lg:mb-10">
                        {/* Products Stats */}
                        <div className="p-4 lg:p-6 rounded-2xl shadow-xl bg-gradient-to-br from-blue-200 to-blue-50 flex items-center justify-between">
                            <div>
                                <p className="text-xs lg:text-sm text-blue-900 font-semibold opacity-80">Total Products</p>
                                <h3 className="text-2xl lg:text-3xl font-extrabold text-blue-900">{productCount}</h3>
                            </div>
                            <Package className="w-10 h-10 lg:w-14 lg:h-14 text-blue-500 opacity-80" />
                        </div>
                        {/* Orders Stats */}
                        <div className="p-4 lg:p-6 rounded-2xl shadow-xl bg-gradient-to-br from-cyan-200 to-cyan-50 flex items-center justify-between">
                            <div>
                                <p className="text-xs lg:text-sm text-cyan-900 font-semibold opacity-80">Total Orders</p>
                                <h3 className="text-2xl lg:text-3xl font-extrabold text-cyan-900">{orderCount}</h3>
                            </div>
                            <ShoppingCart className="w-10 h-10 lg:w-14 lg:h-14 text-cyan-500 opacity-80" />
                        </div>
                        {/* Users Stats */}
                        <div className="p-4 lg:p-6 rounded-2xl shadow-xl bg-gradient-to-br from-indigo-200 to-indigo-50 flex items-center justify-between">
                            <div>
                                <p className="text-xs lg:text-sm text-indigo-900 font-semibold opacity-80">Total Users</p>
                                <h3 className="text-2xl lg:text-3xl font-extrabold text-indigo-900">{userCount}</h3>
                            </div>
                            <Users className="w-10 h-10 lg:w-14 lg:h-14 text-indigo-500 opacity-80" />
                        </div>
                        {/* Revenue Stats */}
                        <div className="p-4 lg:p-6 rounded-2xl shadow-xl bg-gradient-to-br from-sky-200 to-sky-50 flex items-center justify-between">
                            <div>
                                <p className="text-xs lg:text-sm text-sky-900 font-semibold opacity-80">Total Revenue</p>
                                <h3 className="text-2xl lg:text-3xl font-extrabold text-sky-900">₹{totalRevenue.toFixed(2)}</h3>
                            </div>
                            <TrendingUp className="w-10 h-10 lg:w-14 lg:h-14 text-sky-500 opacity-80" />
                        </div>
                    </div>
                    )}

                    {/* Tab Content */}
                    <div className={`${userRole === 'delivery_boy' && isMobile 
                        ? 'bg-white rounded-lg shadow-sm pb-16' 
                        : 'rounded-2xl shadow-2xl bg-white'
                    } ${userRole === 'delivery_boy' && isMobile ? 'p-2' : 'p-4 lg:p-6'}`}>
                        {renderContent()}
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation for Delivery Boys */}
            {userRole === 'delivery_boy' && isMobile && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
                    <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                                        activeTab === item.id
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-600 hover:text-gray-800'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="text-xs font-medium leading-none">
                                        {item.label.includes('Dashboard') ? 'Delivery' : item.label}
                                    </span>
                                </button>
                            );
                        })}
                        <button
                            onClick={handleLogout}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg text-red-600 hover:bg-red-50 transition-all"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="text-xs font-medium leading-none">Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
