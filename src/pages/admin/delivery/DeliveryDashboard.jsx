import React, { useEffect, useState, useContext } from 'react';
import { collection, getDocs, doc, updateDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { fireDB } from '../../../firebase/FirebaseConfig';
import { 
    RefreshCw, 
    Search, 
    Filter, 
    ListOrdered, 
    MapPin, 
    Phone, 
    CheckCircle, 
    ShoppingBag, 
    Users, 
    Clock,
    Navigation,
    AlertCircle,
    Package,
    Truck,
    User,
    Calendar,
    Star,
    MessageCircle,
    Bell,
    Wifi,
    WifiOff,
    Battery,
    BatteryCharging,
    Eye,
    EyeOff,
    Download,
    Printer,
    Settings,
    Route,
    Zap,
    Shield,
    Award
} from 'lucide-react';
import { toast } from 'react-toastify';
import myContext from '../../../context/data/myContext';

function groupOrdersByDate(orders) {
  const groups = {};
  orders.forEach(order => {
    const date = order.date || 'Unknown Date';
    if (!groups[date]) groups[date] = [];
    groups[date].push(order);
  });
  const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));
  return { groups, sortedDates };
}

function groupOrdersByArea(orders) {
  const groups = {};
  orders.forEach(order => {
    const area = order.addressInfo?.pincode || order.addressInfo?.address || 'Unknown Area';
    if (!groups[area]) groups[area] = [];
    groups[area].push(order);
  });
  const sortedAreas = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
  return { groups, sortedAreas };
}

function groupOrdersByCustomer(orders) {
  const groups = {};
  orders.forEach(order => {
    const customerKey = `${order.addressInfo?.name}-${order.addressInfo?.phoneNumber}-${order.date}`;
    if (!groups[customerKey]) {
      groups[customerKey] = {
        customerName: order.addressInfo?.name,
        phoneNumber: order.addressInfo?.phoneNumber,
        date: order.date,
        address: order.addressInfo,
        orders: [],
        totalItems: 0,
        totalAmount: 0,
        status: 'pending'
      };
    }
    groups[customerKey].orders.push(order);
    groups[customerKey].totalItems += order.cartItems?.length || 0;
    groups[customerKey].totalAmount += order.grandTotal || 0;
    if (order.status === 'delivered') {
      groups[customerKey].status = 'delivered';
    }
  });
  return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export default function DeliveryDashboard() {
  const context = useContext(myContext);
  const { order: contextOrders } = context;
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [tab, setTab] = useState(0); // 0: Today's Orders, 1: Area-wise, 2: Customer-wise
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // pending, delivered, all
  const [expandedArea, setExpandedArea] = useState({});
  const [expandedCustomer, setExpandedCustomer] = useState({});
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [showCompleted, setShowCompleted] = useState(false);
  const [deliveryStats, setDeliveryStats] = useState({
    todayDelivered: 0,
    todayPending: 0,
    totalEarnings: 0,
    averageRating: 4.8,
    totalDistance: 0,
    averageDeliveryTime: 0
  });
  const [urgentOrders, setUrgentOrders] = useState([]);
  const [showNotifications, setShowNotifications] = useState(true);

  // Real-time connection status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Battery level simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setBatteryLevel(prev => {
        if (prev > 20) return prev - 0.1;
        return prev;
      });
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
    const querySnapshot = await getDocs(collection(fireDB, 'orders'));
    const allOrders = [];
    querySnapshot.forEach(docSnap => {
      allOrders.push({ id: docSnap.id, ...docSnap.data() });
    });
    setOrders(allOrders);
      
      // Calculate delivery stats
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = allOrders.filter(o => o.date === today);
      const delivered = todayOrders.filter(o => o.status === 'delivered').length;
      const pending = todayOrders.filter(o => o.status !== 'delivered').length;
      const earnings = todayOrders.filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
      
      setDeliveryStats({
        todayDelivered: delivered,
        todayPending: pending,
        totalEarnings: earnings,
        averageRating: 4.8
      });
    } catch (error) {
      toast.error('Failed to fetch orders');
      console.error('Error fetching orders:', error);
    } finally {
    setLoading(false);
    }
  };

  // Real-time updates
  useEffect(() => {
    const q = query(collection(fireDB, 'orders'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const allOrders = [];
      querySnapshot.forEach(docSnap => {
        allOrders.push({ id: docSnap.id, ...docSnap.data() });
      });
      setOrders(allOrders);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleMarkDelivered = async (orderId) => {
    setUpdating(prev => ({ ...prev, [orderId]: true }));
    try {
      await updateDoc(doc(fireDB, 'orders', orderId), { 
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        deliveredBy: 'Delivery Partner'
      });
      toast.success('Order marked as delivered!');
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleMarkAllDelivered = async (orderIds) => {
    for (const orderId of orderIds) {
      await handleMarkDelivered(orderId);
    }
    toast.success('All orders marked as delivered!');
  };

  const handleMarkCustomerDelivered = async (customerOrders) => {
    for (const order of customerOrders) {
      await handleMarkDelivered(order.id);
    }
    toast.success('All customer orders delivered!');
  };

  // Filter orders by status and search
  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (!showCompleted && order.status === 'delivered') return false;
    if (search) {
      const s = search.toLowerCase();
      const name = order.addressInfo?.name?.toLowerCase() || '';
      const phone = order.addressInfo?.phoneNumber || '';
      const address = order.addressInfo?.address?.toLowerCase() || '';
      if (!name.includes(s) && !phone.includes(s) && !address.includes(s)) return false;
    }
    return true;
  });

  // Grouped data
  const { groups: dateGroups, sortedDates } = groupOrdersByDate(filteredOrders);
  const { groups: areaGroups, sortedAreas } = groupOrdersByArea(filteredOrders);
  const customerGroups = groupOrdersByCustomer(filteredOrders);

  const today = new Date().toISOString().split('T')[0];
  const todayOrders = filteredOrders.filter(o => o.date === today);
  
  // Check for urgent orders (older than 2 hours)
  useEffect(() => {
    const urgent = todayOrders.filter(order => {
      const orderTime = new Date(order.timestamp?.toDate?.() || order.date);
      const now = new Date();
      const diffHours = (now - orderTime) / (1000 * 60 * 60);
      return diffHours > 2 && order.status !== 'delivered';
    });
    setUrgentOrders(urgent);
  }, [todayOrders]);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header with Status Bar - Mobile Optimized */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs sm:text-sm font-medium text-gray-700">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Battery className={`w-3 h-3 sm:w-4 sm:h-4 ${batteryLevel < 20 ? 'text-red-500' : 'text-green-500'}`} />
                <span className="text-xs sm:text-sm text-gray-600">{batteryLevel.toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <button 
                onClick={() => setOnlineStatus(!onlineStatus)}
                className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                  onlineStatus 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {onlineStatus ? 'Available' : 'Busy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
        {/* Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-2 sm:p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Today's Deliveries</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">{deliveryStats.todayDelivered}</p>
              </div>
              <div className="p-1 sm:p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-2 sm:p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Pending Orders</p>
                <p className="text-lg sm:text-2xl font-bold text-orange-600">{deliveryStats.todayPending}</p>
              </div>
              <div className="p-1 sm:p-2 bg-orange-100 rounded-lg">
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-2 sm:p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Today's Earnings</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600">₹{deliveryStats.totalEarnings}</p>
              </div>
              <div className="p-1 sm:p-2 bg-blue-100 rounded-lg">
                <Award className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-2 sm:p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Rating</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-600">{deliveryStats.averageRating}</p>
              </div>
              <div className="p-1 sm:p-2 bg-purple-100 rounded-lg">
                <Star className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-2 sm:p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Distance</p>
                <p className="text-lg sm:text-2xl font-bold text-indigo-600">{deliveryStats.totalDistance}km</p>
              </div>
              <div className="p-1 sm:p-2 bg-indigo-100 rounded-lg">
                <Route className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-2 sm:p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Avg Time</p>
                <p className="text-lg sm:text-2xl font-bold text-teal-600">{deliveryStats.averageDeliveryTime}min</p>
              </div>
              <div className="p-1 sm:p-2 bg-teal-100 rounded-lg">
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-teal-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Header - Mobile Optimized */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1 sm:p-2 bg-green-100 rounded-lg">
              <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-800">Delivery Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600 hidden sm:block">Manage your deliveries efficiently</p>
            </div>
          </div>
          
          {/* Mobile-First Controls */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Search Bar - Full width on mobile */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search customers, addresses..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-200 text-sm"
              />
              <Search className="absolute left-2 sm:left-3 top-2.5 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            </div>
            
            {/* Controls Row */}
            <div className="flex gap-2">
              <button 
                onClick={fetchOrders} 
                className="p-2 rounded-lg bg-green-100 hover:bg-green-200 transition flex-shrink-0" 
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
              </button>
            
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
                className="py-2 px-2 sm:px-3 rounded-lg border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-200 flex-1 sm:flex-none"
            >
              <option value="pending">Pending</option>
              <option value="delivered">Delivered</option>
              <option value="all">All</option>
            </select>
            
            <button
              onClick={() => setShowCompleted(!showCompleted)}
                className={`p-2 rounded-lg text-sm font-medium transition flex-shrink-0 ${
                showCompleted 
                  ? 'bg-gray-100 text-gray-700' 
                  : 'bg-green-100 text-green-700'
              }`}
                title={showCompleted ? 'Hide Completed' : 'Show Completed'}
            >
              {showCompleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            </div>
          </div>
        </div>

        {/* Urgent Orders Alert */}
        {urgentOrders.length > 0 && showNotifications && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Urgent Orders!</h3>
                  <p className="text-red-600">You have {urgentOrders.length} orders waiting for more than 2 hours</p>
                </div>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {urgentOrders.slice(0, 3).map(order => (
                <div key={order.id} className="bg-white rounded-lg p-3 border border-red-200">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{order.addressInfo?.name}</div>
                        <div className="text-sm text-gray-600">{order.addressInfo?.phoneNumber}</div>
                      </div>
                      <button
                        onClick={() => handleMarkDelivered(order.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                      >
                        Deliver Now
                      </button>
                    </div>
                    <div className="flex gap-2">
                      {order.addressInfo?.phoneNumber && (
                        <a
                          href={`tel:${order.addressInfo.phoneNumber}`}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition"
                        >
                          <Phone className="w-3 h-3" />
                          Call
                        </a>
                      )}
                      {order.addressInfo?.alternatePhone && (
                        <a
                          href={`tel:${order.addressInfo.alternatePhone}`}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200 transition"
                        >
                          <Phone className="w-3 h-3" />
                          Alt
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions - Mobile Optimized */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">Quick Actions</h3>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">
                {isOnline ? 'Online - Ready for deliveries' : 'Offline - Not available'}
              </span>
              <span className="text-xs text-gray-600 sm:hidden">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">Mark All Delivered</span>
            </button>
            <button className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition">
              <Navigation className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">Optimize Route</span>
            </button>
            <button className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition">
              <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">Send Updates</span>
            </button>
            <button className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">Report Issue</span>
            </button>
          </div>
        </div>

        {/* Tabs - Mobile Optimized */}
        <div className="mb-4 sm:mb-6">
          <div className="flex gap-0.5 sm:gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
            <button
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap ${
                tab === 0 
                  ? 'bg-white text-green-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setTab(0)}
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Today's ({todayOrders.length})</span>
            </button>
            <button
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap ${
                tab === 1 
                  ? 'bg-white text-green-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setTab(1)}
            >
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Area-wise ({sortedAreas.length})</span>
            </button>
            <button
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap ${
                tab === 2 
                  ? 'bg-white text-green-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setTab(2)}
            >
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Customer-wise ({customerGroups.length})</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-600">Loading orders...</span>
          </div>
        ) : (
          <div>
            {/* Today's Orders Tab */}
            {tab === 0 && (
              <div className="space-y-6">
                {todayOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders for today</h3>
                    <p className="text-gray-500">All caught up! 🎉</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {todayOrders.map(order => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        updating={updating} 
                        handleMarkDelivered={handleMarkDelivered}
                        isToday={true}
                      />
                        ))}
                      </div>
                )}
              </div>
            )}

            {/* Area-wise Tab */}
            {tab === 1 && (
              <div className="space-y-6">
                {sortedAreas.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No orders found.</div>
                ) : (
                  sortedAreas.map(area => (
                    <div key={area} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div
                        className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition"
                        onClick={() => setExpandedArea(prev => ({ ...prev, [area]: !prev[area] }))}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <MapPin className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <div className="font-bold text-lg text-gray-900">{area}</div>
                            {areaGroups[area][0]?.addressInfo?.city && (
                              <div className="text-sm text-blue-600">{areaGroups[area][0].addressInfo.city}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-2">
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                            {areaGroups[area].length} orders
                          </span>
                            <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
                              {areaGroups[area].filter(o => o.status !== 'delivered').length} pending
                          </span>
                        </div>
                        <button
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium shadow hover:bg-green-700 transition"
                            onClick={e => { 
                              e.stopPropagation(); 
                              handleMarkAllDelivered(areaGroups[area].filter(o => o.status !== 'delivered').map(o => o.id)); 
                            }}
                          disabled={areaGroups[area].every(o => o.status === 'delivered')}
                        >
                            <CheckCircle className="w-4 h-4" /> 
                            Mark All Delivered
                        </button>
                        </div>
                      </div>
                      {expandedArea[area] && (
                        <div className="border-t border-gray-200 p-6">
                          <div className="mb-4">
                            <div className="text-sm text-gray-600 mb-2 font-medium">Quick Actions for {area}:</div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const phoneNumbers = areaGroups[area]
                                    .filter(o => o.addressInfo?.phoneNumber)
                                    .map(o => o.addressInfo.phoneNumber)
                                    .filter((phone, index, arr) => arr.indexOf(phone) === index); // Remove duplicates
                                  
                                  if (phoneNumbers.length > 0) {
                                    // Create a message with all phone numbers
                                    const message = `Customers in ${area}:\n${phoneNumbers.map((phone, index) => `${index + 1}. ${phone}`).join('\n')}`;
                                    alert(message);
                                  }
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition"
                              >
                                <Phone className="w-4 h-4" />
                                View All Numbers
                              </button>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(area)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition"
                              >
                                <Navigation className="w-4 h-4" />
                                View Area Map
                              </a>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {areaGroups[area].map(order => (
                              <OrderCard 
                                key={order.id} 
                                order={order} 
                                updating={updating} 
                                handleMarkDelivered={handleMarkDelivered}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Customer-wise Tab */}
            {tab === 2 && (
              <div className="space-y-6">
                {customerGroups.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No orders found.</div>
                ) : (
                  customerGroups.map((customer, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div
                        className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition"
                        onClick={() => setExpandedCustomer(prev => ({ ...prev, [index]: !prev[index] }))}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <User className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-bold text-lg text-gray-900">{customer.customerName}</div>
                            <div className="text-sm text-gray-600">{customer.phoneNumber}</div>
                            <div className="text-xs text-gray-500">{customer.date}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-2">
                            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                              {customer.orders.length} orders
                            </span>
                            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                              {customer.totalItems} items
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              customer.status === 'delivered' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {customer.status}
                            </span>
                          </div>
                          <button
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium shadow hover:bg-green-700 transition"
                            onClick={e => { 
                              e.stopPropagation(); 
                              handleMarkCustomerDelivered(customer.orders.filter(o => o.status !== 'delivered')); 
                            }}
                            disabled={customer.status === 'delivered'}
                          >
                            <CheckCircle className="w-4 h-4" /> 
                            Deliver All
                          </button>
                        </div>
                      </div>
                      {expandedCustomer[index] && (
                        <div className="border-t border-gray-200 p-6">
                          <div className="grid md:grid-cols-2 gap-6 mb-6">
                            <div>
                              <div className="text-sm text-gray-600 mb-2 font-medium">Delivery Address:</div>
                              <div className="text-gray-800 bg-gray-50 p-3 rounded-lg">
                                {customer.address?.houseNo}, {customer.address?.blockNo}, {customer.address?.landmark}, {customer.address?.address}, {customer.address?.pincode}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 mb-2 font-medium">Contact Information:</div>
                              <div className="space-y-2">
                                {customer.phoneNumber && (
                                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-gray-500" />
                                      <span className="text-sm text-gray-600">Primary:</span>
                                      <span className="text-gray-800 font-medium">{customer.phoneNumber}</span>
                                    </div>
                                    <a
                                      href={`tel:${customer.phoneNumber}`}
                                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                                    >
                                      Call
                                    </a>
                                  </div>
                                )}
                                {customer.address?.alternatePhone && (
                                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-gray-500" />
                                      <span className="text-sm text-gray-600">Alternate:</span>
                                      <span className="text-gray-800 font-medium">{customer.address.alternatePhone}</span>
                                    </div>
                                    <a
                                      href={`tel:${customer.address.alternatePhone}`}
                                      className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition"
                                    >
                                      Call
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {customer.orders.map(order => (
                              <OrderCard 
                                key={order.id} 
                                order={order} 
                                updating={updating} 
                                handleMarkDelivered={handleMarkDelivered}
                                showCustomerInfo={false}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, updating, handleMarkDelivered, isToday = false, showCustomerInfo = true }) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = () => {
    const orderTime = new Date(order.timestamp?.toDate?.() || order.date);
    const now = new Date();
    const diffHours = (now - orderTime) / (1000 * 60 * 60);
    
    if (diffHours > 4) return 'border-red-500 bg-red-50';
    if (diffHours > 2) return 'border-orange-500 bg-orange-50';
    return 'border-gray-200';
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 ${getPriorityColor()} hover:shadow-lg transition-all`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
        <div>
            <div className="text-xs text-gray-500 font-medium">ORDER ID</div>
            <div className="font-bold text-lg text-gray-900">
              {order.orderId ? `#${order.orderId}` : `#${order.id.slice(-8)}`}
            </div>
            {isToday && (
              <div className="text-xs text-green-600 font-medium mt-1">
                <Clock className="w-3 h-3 inline mr-1" />
                Today
              </div>
            )}
        </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
            {order.grandTotal && (
              <div className="text-sm font-bold text-green-600">
                ₹{order.grandTotal}
              </div>
            )}
          </div>
        </div>

        {/* Customer Info */}
        {showCustomerInfo && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">{order.addressInfo?.name}</span>
            </div>
            <div className="space-y-2">
              {order.addressInfo?.phoneNumber && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Primary:</span>
                    <a 
                      href={`tel:${order.addressInfo.phoneNumber}`} 
                      className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      {order.addressInfo.phoneNumber}
                    </a>
                  </div>
                  <a
                    href={`tel:${order.addressInfo.phoneNumber}`}
                    className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition"
                    title="Call Primary Number"
                  >
                    <Phone className="w-3 h-3" />
                  </a>
                </div>
              )}
              {order.addressInfo?.alternatePhone && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Alternate:</span>
                    <a 
                      href={`tel:${order.addressInfo.alternatePhone}`} 
                      className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                    >
                      {order.addressInfo.alternatePhone}
                    </a>
                  </div>
                  <a
                    href={`tel:${order.addressInfo.alternatePhone}`}
                    className="p-1 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 transition"
                    title="Call Alternate Number"
                  >
                    <Phone className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
      </div>
        )}

        {/* Items Preview */}
        <div className="mb-3">
          <div className="text-xs text-gray-500 font-medium mb-2">ITEMS</div>
      <div className="flex items-center gap-2">
        {order.cartItems?.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs">
                <span className="font-medium">{item.title || item.name}</span>
                <span className="text-gray-500">
                  ({item.quantity} {(item.category || 'vegetables').toLowerCase().includes('leafy') ? 'pcs' : 'kg'})
                </span>
              </div>
        ))}
        {order.cartItems?.length > 3 && (
          <span className="text-xs text-gray-500">+{order.cartItems.length - 3} more</span>
        )}
      </div>
          </div>

        {/* Address */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 font-medium mb-1">ADDRESS</div>
          <div className="text-sm text-gray-700 line-clamp-2">
            {order.addressInfo?.houseNo}, {order.addressInfo?.blockNo}, {order.addressInfo?.landmark}, {order.addressInfo?.address}, {order.addressInfo?.pincode}
          </div>
      </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showDetails ? 'Hide' : 'Details'}
          </button>
          
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${order.addressInfo?.houseNo || ''} ${order.addressInfo?.blockNo || ''} ${order.addressInfo?.landmark || ''} ${order.addressInfo?.address || ''} ${order.addressInfo?.pincode || ''}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200 transition"
          >
            <Navigation className="w-4 h-4" />
            Map
          </a>
        </div>

        {/* Phone Actions */}
        <div className="flex gap-2 mt-2">
          {order.addressInfo?.phoneNumber && (
            <a
              href={`tel:${order.addressInfo.phoneNumber}`}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition"
            >
              <Phone className="w-4 h-4" />
              Call Primary
            </a>
          )}
          {order.addressInfo?.alternatePhone && (
            <a
              href={`tel:${order.addressInfo.alternatePhone}`}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-100 text-orange-700 text-sm font-medium hover:bg-orange-200 transition"
            >
              <Phone className="w-4 h-4" />
              Call Alt
            </a>
          )}
        </div>

        {/* Mark as Delivered Button */}
        <button
          className={`w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium shadow transition ${
            order.status === 'delivered'
              ? 'bg-green-100 text-green-700 cursor-default'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
          onClick={() => handleMarkDelivered(order.id)}
          disabled={updating[order.id] || order.status === 'delivered'}
        >
          {updating[order.id] ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {order.status === 'delivered' ? 'Delivered' : 'Mark as Delivered'}
        </button>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-1">Order Date</div>
                  <div className="text-sm text-gray-800">{order.date}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-1">Total Items</div>
                  <div className="text-sm text-gray-800">{order.cartItems?.length || 0}</div>
                </div>
              </div>
              
              {/* Phone Numbers Section */}
              <div>
                <div className="text-xs text-gray-500 font-medium mb-2">Contact Information</div>
                <div className="space-y-2">
                  {order.addressInfo?.phoneNumber && (
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-gray-600">Primary:</span>
                        <span className="text-sm font-medium text-gray-800">{order.addressInfo.phoneNumber}</span>
                      </div>
                      <a
                        href={`tel:${order.addressInfo.phoneNumber}`}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition"
                      >
                        Call
                      </a>
                    </div>
                  )}
                  {order.addressInfo?.alternatePhone && (
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-orange-600" />
                        <span className="text-xs text-gray-600">Alternate:</span>
                        <span className="text-sm font-medium text-gray-800">{order.addressInfo.alternatePhone}</span>
                      </div>
                      <a
                        href={`tel:${order.addressInfo.alternatePhone}`}
                        className="px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 transition"
                      >
                        Call
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Additional Order Details */}
              <div>
                <div className="text-xs text-gray-500 font-medium mb-2">Order Details</div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">
                    Order ID: {order.orderId ? `#${order.orderId}` : `#${order.id.slice(-8)}`}
                  </div>
                  {order.grandTotal && (
                    <div className="text-xs text-gray-500">
                      Total Amount: ₹{order.grandTotal}
                    </div>
                  )}
                  {order.timestamp && (
                    <div className="text-xs text-gray-500">
                      Placed: {new Date(order.timestamp?.toDate?.() || order.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 