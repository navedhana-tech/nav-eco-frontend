import React, { useState, useEffect, useMemo, useContext } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Package, 
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  DollarSign,
  Target,
  Award,
  Clock,
  MapPin,
  Star,
  BarChart3,
  PieChart,
  LineChart,
  Settings,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Loader2
} from 'lucide-react';
import { 
  LineChart as RechartsLineChart, 
  BarChart as RechartsBarChart, 
  PieChart as RechartsPieChart,
  Area,
  AreaChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell,
  Bar,
  Line,
  Pie
} from 'recharts';
import myContext from '../../../../context/data/myContext';
import { toast } from 'react-toastify';

const Analytics = () => {
  const context = useContext(myContext);
  const { order, product, loading, setLoading } = context;

  // State management
  const [dateRange, setDateRange] = useState('7');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-refresh simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // Real-time data updates are handled by Firebase listeners in context
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Advanced calculations using real Firebase data
  const analytics = useMemo(() => {
    if (!order || !product) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        uniqueCustomers: 0,
        completionRate: 0,
        growthRate: 0,
        conversionRate: 0,
        categoryData: {},
        trendData: [],
        topProducts: [],
        geoData: [],
        filteredOrders: []
      };
    }

    const filteredOrders = order.filter(orderItem => {
      // Parse order date properly
      let orderDate;
      if (orderItem.timestamp) {
        orderDate = orderItem.timestamp.toDate ? orderItem.timestamp.toDate() : new Date(orderItem.timestamp);
      } else if (orderItem.date) {
        orderDate = new Date(orderItem.date);
      } else {
        return false; // Skip orders without valid date
      }

      const daysAgo = parseInt(dateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      
      const matchesDate = orderDate >= cutoffDate;
      const matchesSearch = searchTerm === '' || 
        (orderItem.addressInfo?.name && orderItem.addressInfo.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (orderItem.addressInfo?.city && orderItem.addressInfo.city.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesDate && matchesSearch;
    });

    // Calculate basic metrics (excluding cancelled orders)
    const totalRevenue = filteredOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (parseFloat(o.grandTotal) || 0), 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
    
    // Count unique customers by phone number
    const uniqueCustomers = new Set(
      filteredOrders
        .map(o => o.addressInfo?.phoneNumber)
        .filter(phone => phone) // Remove undefined/null values
    ).size;

    // Calculate completion rate
    const completedOrders = filteredOrders.filter(o => 
      (o.status || '').toLowerCase() === 'delivered'
    ).length;
    const completionRate = totalOrders ? (completedOrders / totalOrders) * 100 : 0;

    // Mock growth and conversion rates (in real app, these would be calculated from historical data)
    const growthRate = 15.5;
    const conversionRate = 4.2;

    // Category analysis from cart items (excluding cancelled orders)
    const categoryData = {};
    filteredOrders
      .filter(orderItem => orderItem.status !== 'cancelled')
      .forEach(orderItem => {
        const items = orderItem.cartItems || orderItem.items || [];
        items.forEach(item => {
          const cat = item.category || 'Other';
          const itemTotal = (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1);
          categoryData[cat] = (categoryData[cat] || 0) + itemTotal;
        });
      });

    // Daily revenue trend (excluding cancelled orders)
    const dailyRevenue = {};
    const dailyOrders = {};
    
    filteredOrders
      .filter(orderItem => orderItem.status !== 'cancelled')
      .forEach(orderItem => {
        let orderDate;
        if (orderItem.timestamp) {
          orderDate = orderItem.timestamp.toDate ? orderItem.timestamp.toDate() : new Date(orderItem.timestamp);
        } else if (orderItem.date) {
          orderDate = new Date(orderItem.date);
        } else {
          return;
        }
        
        const dateKey = orderDate.toISOString().split('T')[0];
        dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + (parseFloat(orderItem.grandTotal) || 0);
        dailyOrders[dateKey] = (dailyOrders[dateKey] || 0) + 1;
      });

    const trendData = Object.entries(dailyRevenue)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        revenue,
        orders: dailyOrders[date] || 0
      }));

    // Top products analysis (excluding cancelled orders)
    const productSales = {};
    filteredOrders
      .filter(orderItem => orderItem.status !== 'cancelled')
      .forEach(orderItem => {
        const items = orderItem.cartItems || orderItem.items || [];
        items.forEach(item => {
          const key = item.title || item.name || 'Unknown Product';
          productSales[key] = (productSales[key] || 0) + (parseFloat(item.quantity) || 1);
        });
      });

    const topProducts = Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // Geographic distribution (excluding cancelled orders)
    const cityData = {};
    filteredOrders
      .filter(orderItem => orderItem.status !== 'cancelled')
      .forEach(orderItem => {
        const city = orderItem.addressInfo?.city || 'Unknown City';
        const revenue = parseFloat(orderItem.grandTotal) || 0;
        cityData[city] = (cityData[city] || 0) + revenue;
      });

    const geoData = Object.entries(cityData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([city, revenue]) => ({ city, revenue }));

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      uniqueCustomers,
      completionRate,
      growthRate,
      conversionRate,
      categoryData,
      trendData,
      topProducts,
      geoData,
      filteredOrders
    };
  }, [order, product, dateRange, searchTerm]);

  const handleRefresh = () => {
    setRefreshing(true);
    // Trigger context refresh if available
    if (context.getOrderData) {
      context.getOrderData();
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleExport = () => {
    try {
      const data = {
        analytics: analytics,
        exportDate: new Date().toISOString(),
        dateRange: dateRange,
        searchTerm: searchTerm
      };
      
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
      a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
      URL.revokeObjectURL(url);
      toast.success('Analytics exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export analytics');
    }
  };

  const MetricCard = ({ title, value, change, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        <p className="text-sm text-gray-600">{title}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Real-time business insights and performance metrics</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers, cities..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Date Range */}
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              
              {/* Actions */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Revenue"
            value={`₹${analytics.totalRevenue.toLocaleString('en-IN')}`}
            change={analytics.growthRate}
            icon={DollarSign}
            color="bg-blue-600"
            subtitle="This period"
          />
          <MetricCard
            title="Total Orders"
            value={analytics.totalOrders.toLocaleString('en-IN')}
            change={12.3}
            icon={ShoppingBag}
            color="bg-green-600"
            subtitle={`${analytics.completionRate.toFixed(1)}% completed`}
          />
          <MetricCard
            title="Customers"
            value={analytics.uniqueCustomers.toLocaleString('en-IN')}
            change={8.7}
            icon={Users}
            color="bg-purple-600"
            subtitle="Unique customers"
          />
          <MetricCard
            title="Avg Order Value"
            value={`₹${analytics.avgOrderValue.toFixed(0)}`}
            change={analytics.conversionRate}
            icon={Target}
            color="bg-orange-600"
            subtitle="Per transaction"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
              <div className="flex items-center gap-2">
                <LineChart className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">Daily Performance</span>
              </div>
            </div>
            {analytics.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                <p>No data available for selected period</p>
              </div>
            )}
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Category Performance</h3>
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">Revenue by Category</span>
              </div>
            </div>
            {Object.keys(analytics.categoryData).length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={Object.entries(analytics.categoryData).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {Object.entries(analytics.categoryData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']} />
              </RechartsPieChart>
            </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                <p>No category data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-4">
              {analytics.topProducts.length > 0 ? (
                analytics.topProducts.map(([product, sales], index) => (
                <div key={product} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product}</p>
                      <p className="text-sm text-gray-500">{sales} units sold</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium text-gray-700">{(Math.random() * 2 + 3).toFixed(1)}</span>
                  </div>
                </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No product data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Geographic Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Top Cities</h3>
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div className="space-y-4">
              {analytics.geoData.length > 0 ? (
                analytics.geoData.map(({ city, revenue }, index) => (
                <div key={city} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{city}</p>
                        <p className="text-sm text-gray-500">₹{revenue.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(revenue / Math.max(...analytics.geoData.map(d => d.revenue))) * 100}%` }}
                    />
                  </div>
                </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No geographic data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div className="space-y-4">
              {analytics.filteredOrders.length > 0 ? (
                analytics.filteredOrders.slice(0, 5).map(orderItem => (
                  <div key={orderItem.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {orderItem.addressInfo?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">{orderItem.addressInfo?.name || 'Unknown Customer'}</p>
                        <p className="text-sm text-gray-500">₹{(parseFloat(orderItem.grandTotal) || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (orderItem.status || '').toLowerCase() === 'delivered' ? 'bg-green-100 text-green-800' :
                        (orderItem.status || '').toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                        {orderItem.status || 'placed'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {orderItem.timestamp ? 
                          (orderItem.timestamp.toDate ? orderItem.timestamp.toDate().toLocaleDateString() : new Date(orderItem.timestamp).toLocaleDateString()) :
                          orderItem.date ? new Date(orderItem.date).toLocaleDateString() : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No recent orders</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Indicators</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-400 to-blue-600 rounded-full flex items-center justify-center">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900">{analytics.completionRate.toFixed(1)}%</h4>
              <p className="text-gray-600">Order Completion Rate</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
                <Target className="w-10 h-10 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900">{analytics.conversionRate.toFixed(1)}%</h4>
              <p className="text-gray-600">Conversion Rate</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900">{analytics.growthRate.toFixed(1)}%</h4>
              <p className="text-gray-600">Growth Rate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 