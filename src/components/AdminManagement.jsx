import React, { useState, useEffect, useContext } from 'react';
import { 
  UserPlus, 
  Users, 
  Shield, 
  ShieldCheck, 
  Trash2, 
  Edit3, 
  Search, 
  Filter,
  Eye,
  EyeOff,
  Truck,
  Settings,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { fireDB, auth } from '../firebase/FirebaseConfig';
import { toast } from 'react-toastify';
import myContext from '../context/data/myContext';

const AdminManagement = () => {
  const context = useContext(myContext);
  const { user } = context;
  
  const [activeTab, setActiveTab] = useState('overview');
  const [admins, setAdmins] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showAddDelivery, setShowAddDelivery] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  
  // Form states
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sub_admin', // master_admin, sub_admin
    permissions: {
      canCreateSubAdmin: false,
      canDeleteSubAdmin: false,
      canCreateDeliveryBoy: true,
      canManageProducts: true,
      canManageOrders: true,
      canViewAnalytics: true
    }
  });
  
  const [deliveryForm, setDeliveryForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    vehicleNumber: '',
    licenseNumber: '',
    workingArea: '',
    shiftTiming: 'full_time' // full_time, part_time, morning, evening
  });

  // Get current user's role
  const getCurrentUserRole = () => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) return null;
    
    // Check if master admin (hardcoded for now)
    if (currentUser.user?.email === 'omprakash16003@gmail.com') {
      return 'master_admin';
    }
    
    // Check in admins collection
    const adminData = admins.find(admin => admin.email === currentUser.user?.email);
    return adminData?.role || 'user';
  };

  const userRole = getCurrentUserRole();

  // Fetch admins and delivery boys
  useEffect(() => {
    fetchAdmins();
    fetchDeliveryBoys();
  }, []);

  const fetchAdmins = async () => {
    try {
      const q = query(collection(fireDB, 'admins'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const adminList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAdmins(adminList);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchDeliveryBoys = async () => {
    try {
      const q = query(collection(fireDB, 'delivery_boys'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const deliveryList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDeliveryBoys(deliveryList);
    } catch (error) {
      console.error('Error fetching delivery boys:', error);
    }
  };

  // Create admin
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (userRole !== 'master_admin') {
      toast.error('Only master admin can create sub-admins');
      return;
    }
    
    setLoading(true);
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        adminForm.email, 
        adminForm.password
      );
      
      // Add to admins collection
      await addDoc(collection(fireDB, 'admins'), {
        uid: userCredential.user.uid,
        name: adminForm.name,
        email: adminForm.email,
        role: adminForm.role,
        permissions: adminForm.permissions,
        createdAt: Timestamp.now(),
        createdBy: JSON.parse(localStorage.getItem('user')).user.email,
        isActive: true,
        lastLogin: null
      });
      
      toast.success('Admin created successfully!');
      setShowAddAdmin(false);
      setAdminForm({
        name: '',
        email: '',
        password: '',
        role: 'sub_admin',
        permissions: {
          canCreateSubAdmin: false,
          canDeleteSubAdmin: false,
          canCreateDeliveryBoy: true,
          canManageProducts: true,
          canManageOrders: true,
          canViewAnalytics: true
        }
      });
      fetchAdmins();
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error('Failed to create admin: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create delivery boy
  const handleCreateDeliveryBoy = async (e) => {
    e.preventDefault();
    if (userRole !== 'master_admin' && userRole !== 'sub_admin') {
      toast.error('Access denied');
      return;
    }
    
    setLoading(true);
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        deliveryForm.email, 
        deliveryForm.password
      );
      
      // Add to delivery_boys collection
      await addDoc(collection(fireDB, 'delivery_boys'), {
        uid: userCredential.user.uid,
        name: deliveryForm.name,
        email: deliveryForm.email,
        phone: deliveryForm.phone,
        address: deliveryForm.address,
        vehicleNumber: deliveryForm.vehicleNumber,
        licenseNumber: deliveryForm.licenseNumber,
        workingArea: deliveryForm.workingArea,
        shiftTiming: deliveryForm.shiftTiming,
        createdAt: Timestamp.now(),
        createdBy: JSON.parse(localStorage.getItem('user')).user.email,
        isActive: true,
        isOnline: false,
        totalDeliveries: 0,
        rating: 0,
        lastLocation: null
      });
      
      toast.success('Delivery boy created successfully!');
      setShowAddDelivery(false);
      setDeliveryForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        vehicleNumber: '',
        licenseNumber: '',
        workingArea: '',
        shiftTiming: 'full_time'
      });
      fetchDeliveryBoys();
    } catch (error) {
      console.error('Error creating delivery boy:', error);
      toast.error('Failed to create delivery boy: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete admin
  const handleDeleteAdmin = async (adminId, adminEmail) => {
    if (userRole !== 'master_admin') {
      toast.error('Only master admin can delete admins');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this admin?')) {
      try {
        await deleteDoc(doc(fireDB, 'admins', adminId));
        toast.success('Admin deleted successfully');
        fetchAdmins();
      } catch (error) {
        console.error('Error deleting admin:', error);
        toast.error('Failed to delete admin');
      }
    }
  };

  // Delete delivery boy
  const handleDeleteDeliveryBoy = async (deliveryId) => {
    if (userRole !== 'master_admin' && userRole !== 'sub_admin') {
      toast.error('Access denied');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this delivery boy?')) {
      try {
        await deleteDoc(doc(fireDB, 'delivery_boys', deliveryId));
        toast.success('Delivery boy deleted successfully');
        fetchDeliveryBoys();
      } catch (error) {
        console.error('Error deleting delivery boy:', error);
        toast.error('Failed to delete delivery boy');
      }
    }
  };

  // Toggle admin status
  const toggleAdminStatus = async (adminId, currentStatus) => {
    if (userRole !== 'master_admin') {
      toast.error('Only master admin can manage admin status');
      return;
    }
    
    try {
      await updateDoc(doc(fireDB, 'admins', adminId), {
        isActive: !currentStatus,
        updatedAt: Timestamp.now()
      });
      toast.success(`Admin ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchAdmins();
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error('Failed to update admin status');
    }
  };

  // Toggle delivery boy status
  const toggleDeliveryBoyStatus = async (deliveryId, currentStatus) => {
    if (userRole !== 'master_admin' && userRole !== 'sub_admin') {
      toast.error('Access denied');
      return;
    }
    
    try {
      await updateDoc(doc(fireDB, 'delivery_boys', deliveryId), {
        isActive: !currentStatus,
        updatedAt: Timestamp.now()
      });
      toast.success(`Delivery boy ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchDeliveryBoys();
    } catch (error) {
      console.error('Error updating delivery boy status:', error);
      toast.error('Failed to update delivery boy status');
    }
  };

  // Filter data based on search and role
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         admin.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || admin.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const filteredDeliveryBoys = deliveryBoys.filter(delivery => {
    const matchesSearch = delivery.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         delivery.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         delivery.phone.includes(searchQuery);
    return matchesSearch;
  });

  if (userRole !== 'master_admin' && userRole !== 'sub_admin') {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-semibold">Access Denied</h3>
        </div>
        <p className="text-red-600 mt-2">You don't have permission to access admin management.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Admin Management</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Role:</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            userRole === 'master_admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {userRole === 'master_admin' ? 'Master Admin' : 'Sub Admin'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {['overview', 'admins', 'delivery'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === tab
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'admins' && 'Admins'}
            {tab === 'delivery' && 'Delivery Boys'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Admins</p>
                <p className="text-3xl font-bold">{admins.length}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Active Admins</p>
                <p className="text-3xl font-bold">{admins.filter(a => a.isActive).length}</p>
              </div>
              <ShieldCheck className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Delivery Boys</p>
                <p className="text-3xl font-bold">{deliveryBoys.length}</p>
              </div>
              <Truck className="w-8 h-8 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Online Delivery</p>
                <p className="text-3xl font-bold">{deliveryBoys.filter(d => d.isOnline).length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>
      )}

      {/* Admins Tab */}
      {activeTab === 'admins' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="master_admin">Master Admin</option>
              <option value="sub_admin">Sub Admin</option>
            </select>
            {userRole === 'master_admin' && (
              <button
                onClick={() => setShowAddAdmin(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Admin
              </button>
            )}
          </div>

          {/* Admins List */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                        <div className="text-sm text-gray-500">{admin.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        admin.role === 'master_admin' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {admin.role === 'master_admin' ? 'Master Admin' : 'Sub Admin'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        admin.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {admin.createdAt?.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userRole === 'master_admin' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleAdminStatus(admin.id, admin.isActive)}
                            className={`p-2 rounded-lg transition-colors duration-200 ${
                              admin.isActive 
                                ? 'text-gray-600 hover:bg-gray-100' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {admin.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delivery Boys Tab */}
      {activeTab === 'delivery' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search delivery boys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowAddDelivery(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Delivery Boy
            </button>
          </div>

          {/* Delivery Boys List */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deliveries</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDeliveryBoys.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{delivery.name}</div>
                        <div className="text-sm text-gray-500">{delivery.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{delivery.phone}</div>
                      <div className="text-sm text-gray-500">{delivery.workingArea}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{delivery.vehicleNumber}</div>
                      <div className="text-sm text-gray-500">{delivery.shiftTiming}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          delivery.isOnline ? 'bg-green-500' : 'bg-gray-300'
                        }`}></span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          delivery.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {delivery.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {delivery.totalDeliveries || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleDeliveryBoyStatus(delivery.id, delivery.isActive)}
                          className={`p-2 rounded-lg transition-colors duration-200 ${
                            delivery.isActive 
                              ? 'text-gray-600 hover:bg-gray-100' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {delivery.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteDeliveryBoy(delivery.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Admin</h3>
              <button
                onClick={() => setShowAddAdmin(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({...adminForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={adminForm.role}
                  onChange={(e) => setAdminForm({...adminForm, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="sub_admin">Sub Admin</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddAdmin(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Delivery Boy Modal */}
      {showAddDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Delivery Boy</h3>
              <button
                onClick={() => setShowAddDelivery(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateDeliveryBoy} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={deliveryForm.name}
                  onChange={(e) => setDeliveryForm({...deliveryForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={deliveryForm.email}
                  onChange={(e) => setDeliveryForm({...deliveryForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={deliveryForm.password}
                  onChange={(e) => setDeliveryForm({...deliveryForm, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={deliveryForm.phone}
                  onChange={(e) => setDeliveryForm({...deliveryForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  required
                  value={deliveryForm.address}
                  onChange={(e) => setDeliveryForm({...deliveryForm, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                <input
                  type="text"
                  required
                  value={deliveryForm.vehicleNumber}
                  onChange={(e) => setDeliveryForm({...deliveryForm, vehicleNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <input
                  type="text"
                  required
                  value={deliveryForm.licenseNumber}
                  onChange={(e) => setDeliveryForm({...deliveryForm, licenseNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Working Area</label>
                <input
                  type="text"
                  required
                  value={deliveryForm.workingArea}
                  onChange={(e) => setDeliveryForm({...deliveryForm, workingArea: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift Timing</label>
                <select
                  value={deliveryForm.shiftTiming}
                  onChange={(e) => setDeliveryForm({...deliveryForm, shiftTiming: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="morning">Morning Shift</option>
                  <option value="evening">Evening Shift</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddDelivery(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Delivery Boy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement; 