import { useState, useEffect, useContext } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit3, 
  Save, 
  X, 
  Package, 
  Calendar, 
   
  Truck, 
  CheckCircle, 
  Clock,
  ShoppingBag,
  Heart,
  Settings,
  Shield,
  Star,
  Bell,
  Moon,
  Sun,
  Globe,
  Lock,
  BellRing,
  BellOff,
  Trash2,
  LogOut,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Languages
} from 'lucide-react'
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { fireDB } from '../../firebase/FirebaseConfig'
import myContext from '../../context/data/myContext'
import Layout from '../../components/layout/Layout'
import Loader from '../../components/loader/Loader'
import { auth } from '../../firebase/FirebaseConfig'
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useUserTracking } from '../../hooks/useUserTracking'

export default function Profile() {
  const { trackPage } = useUserTracking();
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const navigate = useNavigate()
  const context = useContext(myContext)

  // Track page visit
  useEffect(() => {
    trackPage('profile');
  }, [trackPage]);

  // Form state for editing
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    alternatePhone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  })

  const [favoriteIds, setFavoriteIds] = useState([])
  const [favoriteProducts, setFavoriteProducts] = useState([])

  // Add new state for settings
  const [settingsData, setSettingsData] = useState({
    notifications: {
      orderUpdates: true,
      promotions: true,
      newsletter: false,
      stockAlerts: true
    },
    privacy: {
      profileVisibility: 'public',
      showOrderHistory: true,
      showFavorites: true
    },
    preferences: {
      language: 'en',
      theme: 'light',
      currency: 'INR'
    },
    security: {
      twoFactorAuth: false,
      loginAlerts: true
    }
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'))
    if (!userData) {
      navigate('/')
      return
    }
    setUser(userData)
    fetchUserDetails(userData.user?.uid || userData.user?.email)
    fetchUserOrders(userData.user?.uid || userData.user?.email)
  }, [navigate])

  useEffect(() => {
    if (activeTab !== 'favorites') return;
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData?.user?.uid) return;
    const fetchFavorites = async () => {
      const favDoc = await getDoc(doc(fireDB, 'favorites', userData.user.uid));
      if (favDoc.exists()) {
        const ids = favDoc.data().productIds || [];
        setFavoriteIds(ids);
        setFavoriteProducts(context.product.filter(p => ids.includes(p.id)));
      } else {
        setFavoriteIds([]);
        setFavoriteProducts([]);
      }
    };
    fetchFavorites();
  }, [activeTab, context.product]);

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.user?.uid) return;
      try {
        const userDocRef = doc(fireDB, 'users', user.user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().settings) {
          setSettingsData(prev => ({
            ...prev,
            ...userDoc.data().settings
          }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, [user]);

  // Fetch user details from Firestore
  const fetchUserDetails = async (userIdOrEmail) => {
    try {
      // Try by UID first, fallback to email
      let userDocRef = null
      let userDocSnap = null
      if (userIdOrEmail) {
        userDocRef = doc(fireDB, 'users', userIdOrEmail)
        userDocSnap = await getDoc(userDocRef)
      }
      if (!userDocSnap || !userDocSnap.exists()) {
        // Try by email
        const q = query(collection(fireDB, 'users'), where('email', '==', userIdOrEmail))
        const querySnapshot = await getDocs(q)
        if (!querySnapshot.empty) {
          userDocSnap = querySnapshot.docs[0]
        }
      }
      if (userDocSnap && userDocSnap.exists()) {
        const data = userDocSnap.data()
        setFormData({
          name: data.displayName || data.name || data.email?.split('@')[0] || '',
          email: data.email || '',
          phone: data.phone || '',
          alternatePhone: data.alternatePhone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || ''
        })
      }
    } catch (error) {
      console.error('Error fetching user details:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch user orders from Firestore
  const fetchUserOrders = async (userIdOrEmail) => {
    try {
      let q
      if (userIdOrEmail) {
        // Try by UID or email
        q = query(collection(fireDB, 'orders'), where('userid', '==', userIdOrEmail))
      } else {
        setOrders([])
        return
      }
      const querySnapshot = await getDocs(q)
      const userOrders = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
      // Sort orders by date in descending order (latest first)
      const sortedOrders = userOrders.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA;
      });
      setOrders(sortedOrders)
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Phone validation function
  const isValidPhone = (str) => {
    if (!str) return true; // Allow empty for optional fields
    const cleanPhone = str.replace(/\D/g, '');
    if (cleanPhone.length !== 10) return false;
    if (!/^[6789]/.test(cleanPhone)) return false;
    if (/^([0-9])\1{9}$/.test(cleanPhone)) return false;
    if (/0123456789|1234567890|9876543210|0987654321/.test(cleanPhone)) return false;
    return true;
  };

  const handleSave = async () => {
    try {
      // Validate phone numbers
      if (formData.phone && !isValidPhone(formData.phone)) {
        toast.error('Please enter a valid 10-digit phone number starting with 6, 7, 8, or 9');
        return;
      }
      
      if (formData.alternatePhone && !isValidPhone(formData.alternatePhone)) {
        toast.error('Please enter a valid 10-digit alternate phone number starting with 6, 7, 8, or 9');
        return;
      }
      
      if (formData.phone && formData.alternatePhone && 
          formData.phone.replace(/\D/g, '') === formData.alternatePhone.replace(/\D/g, '')) {
        toast.error('Alternate phone number must be different from primary phone number');
        return;
      }

      // Update user data in Firestore
      let userIdOrEmail = user.user?.uid || user.user?.email
      let userDocRef = null
      if (user.user?.uid) {
        userDocRef = doc(fireDB, 'users', user.user.uid)
      } else {
        // Find by email
        const q = query(collection(fireDB, 'users'), where('email', '==', user.user?.email))
        const querySnapshot = await getDocs(q)
        if (!querySnapshot.empty) {
          userDocRef = querySnapshot.docs[0].ref
        }
      }
      if (userDocRef) {
        await updateDoc(userDocRef, formData)
        setIsEditing(false)
        fetchUserDetails(userIdOrEmail)
        toast.success('Profile updated successfully!')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    }
  }

  const handleCancel = () => {
    fetchUserDetails(user.user?.uid || user.user?.email)
    setIsEditing(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-100'
      case 'processing': return 'text-blue-600 bg-blue-100'
      case 'shipped': return 'text-purple-600 bg-purple-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-4 w-4" />
      case 'processing': return <Clock className="h-4 w-4" />
      case 'shipped': return <Truck className="h-4 w-4" />
      case 'cancelled': return <X className="h-4 w-4" />
      default: return <Package className="h-4 w-4" />
    }
  }

  const calculateOrderTotal = (order) => {
    const items = order.items || order.cartItems || [];
    return items.reduce((sum, item) => sum + (Number(item.price) * (Number(item.quantity) || 1)), 0);
  };

  // Save settings to Firestore
  const saveSettings = async (newSettings) => {
    if (!user?.user?.uid) return;
    try {
      const userDocRef = doc(fireDB, 'users', user.user.uid);
      await updateDoc(userDocRef, {
        settings: newSettings
      });
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  // Handle settings changes
  const handleSettingChange = (category, setting, value) => {
    const newSettings = {
      ...settingsData,
      [category]: {
        ...settingsData[category],
        [setting]: value
      }
    };
    setSettingsData(newSettings);
    saveSettings(newSettings);
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordData.newPassword);
      
      toast.success('Password updated successfully!');
      setShowPasswordChange(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setPasswordError(error.message);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      const user = auth.currentUser;
      await deleteUser(user);
      localStorage.removeItem('user');
      navigate('/');
      toast.success('Account deleted successfully');
    } catch (error) {
      toast.error('Failed to delete account. Please reauthenticate and try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <Layout>
      <div
        className="pt-[96px] pb-10 min-h-0 overflow-y-auto"
        style={{ minHeight: 'calc(100vh - 96px)' }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 w-full">
          {/* Header */}
          <div className="mb-6 sm:mb-8 text-center px-2 sm:px-0">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-green-100 text-green-700 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Your Account, Your Journey</span>
              <span className="sm:hidden">My Account</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-6xl font-bold text-gray-900 mb-3 sm:mb-6 leading-tight break-words px-2">
              My <span className="bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">Profile</span>
            </h1>
            <p className="text-sm sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed break-words px-4">
              <span className="hidden sm:inline">Manage your account details, view your order history, and personalize your experience with Navedhana.</span>
              <span className="sm:hidden">Manage your account and order history</span>
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 sm:mb-8">
            {/* Mobile Tab Navigation - Sticky */}
            <div className="sm:hidden sticky top-[96px] z-40 bg-white border-b border-gray-100 pb-2 mb-4">
              <div className="flex overflow-x-auto scrollbar-hide space-x-1 px-3">
                {[
                  { id: 'profile', name: 'Profile', icon: User },
                  { id: 'orders', name: 'Orders', icon: Package },
                  { id: 'favorites', name: 'Favorites', icon: Heart },
                  { id: 'settings', name: 'Settings', icon: Settings },
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-3 rounded-xl text-xs font-semibold transition-all duration-200 touch-manipulation ${
                        activeTab === tab.id
                          ? 'bg-green-600 text-white shadow-lg scale-105'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span className="whitespace-nowrap">{tab.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Desktop Tab Navigation */}
            <div className="hidden sm:flex justify-center">
              <div className={`flex space-x-1 p-1 rounded-lg bg-white shadow-sm`}>
                {[
                  { id: 'profile', name: 'Profile', icon: User },
                  { id: 'orders', name: 'Orders', icon: Package },
                  { id: 'favorites', name: 'Favorites', icon: Heart },
                  { id: 'settings', name: 'Settings', icon: Settings },
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-green-600 text-white shadow-lg'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className={`rounded-xl shadow-lg bg-white mx-1 sm:mx-0`}>
            {activeTab === 'profile' && (
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold">Personal Information</h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 sm:px-4 sm:py-3 bg-green-600 text-white rounded-full sm:rounded-lg hover:bg-green-700 transition-colors duration-200 touch-manipulation text-sm font-medium shadow-lg"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span className="sm:hidden">Edit</span>
                      <span className="hidden sm:inline">Edit Profile</span>
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors duration-200 touch-manipulation text-sm font-medium shadow-lg"
                      >
                        <Save className="h-4 w-4" />
                        <span className="sm:hidden">Save</span>
                        <span className="hidden sm:inline">Save Changes</span>
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors duration-200 touch-manipulation text-sm font-medium shadow-lg"
                      >
                        <X className="h-4 w-4" />
                        <span className="sm:hidden">✕</span>
                        <span className="hidden sm:inline">Cancel</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-100">
                    <div className="relative">
                      <div className="w-24 h-24 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {user.user?.displayName?.charAt(0) || user.user?.email?.charAt(0) || 'U'}
                      </div>
                      {isEditing && (
                        <button className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-6 sm:h-6 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 transition-colors duration-200 shadow-lg touch-manipulation">
                          <Edit3 className="h-4 w-4 sm:h-3 sm:w-3" />
                        </button>
                      )}
                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className="text-xl sm:text-lg font-semibold text-gray-900">
                        {user.user?.displayName || user.user?.email?.split('@')[0] || 'User'}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Member since {new Date().getFullYear()}
                      </p>
                      <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        ✓ Verified Account
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-2 text-gray-700">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-base"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <User className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-900 font-medium">{formData.name || 'Not provided'}</span>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-2 text-gray-700">Email Address</label>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-base"
                        placeholder="Enter your email address"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <Mail className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-900 font-medium break-all">{formData.email}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Phone Number</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={(e) => {
                          const cleanValue = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData(prev => ({
                            ...prev,
                            phone: cleanValue
                          }));
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-base"
                        placeholder="10-digit mobile number"
                        maxLength="10"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <Phone className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-900 font-medium">{formData.phone || 'Not provided'}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Alternate Phone <span className="text-gray-500 text-xs">(Optional)</span></label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="alternatePhone"
                        value={formData.alternatePhone}
                        onChange={(e) => {
                          const cleanValue = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData(prev => ({
                            ...prev,
                            alternatePhone: cleanValue
                          }));
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-base"
                        placeholder="10-digit mobile number"
                        maxLength="10"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <Phone className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <span className="text-gray-900 font-medium">{formData.alternatePhone || 'Not provided'}</span>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-2 text-gray-700">Address</label>
                    {isEditing ? (
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-base resize-none"
                        placeholder="Enter your full address"
                      />
                    ) : (
                      <div className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <MapPin className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-900 font-medium">{formData.address || 'Not provided'}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">City</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-base"
                        placeholder="Enter your city"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <MapPin className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-900 font-medium">{formData.city || 'Not provided'}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">State</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-base"
                        placeholder="Enter your state"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <MapPin className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-900 font-medium">{formData.state || 'Not provided'}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Pincode</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-base"
                        placeholder="Enter 6-digit pincode"
                        maxLength="6"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <MapPin className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-900 font-medium">{formData.pincode || 'Not provided'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}

            {activeTab === 'orders' && (
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" />
                    Order History
                  </h2>
                  <div className="text-sm text-gray-500">
                    {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                    <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                      Start shopping to see your order history here. Your orders will appear once you make a purchase.
                    </p>
                    <button
                      onClick={() => navigate('/allproducts')}
                      className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-sm"
                    >
                      <ShoppingBag className="h-5 w-5 mr-2" />
                      Browse Products
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(
                      orders.reduce((groups, order) => {
                        const date = order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.timestamp || order.date);
                        const monthYear = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                        if (!groups[monthYear]) {
                          groups[monthYear] = [];
                        }
                        groups[monthYear].push(order);
                        return groups;
                      }, {})
                    ).map(([monthYear, monthOrders]) => (
                      <div key={monthYear}>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="text-lg font-semibold text-gray-900">{monthYear}</div>
                          <div className="h-px flex-1 bg-gray-200"></div>
                          <div className="text-sm text-gray-500 font-medium">
                            {monthOrders.length} {monthOrders.length === 1 ? 'Order' : 'Orders'}
                          </div>
                        </div>
                        <div className="space-y-6">
                          {monthOrders.map((order) => (
                      <div
                        key={order.id}
                              className="bg-green-100 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300"
                            >
                              {/* Order Summary Row */}
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-3 sm:px-6 pt-2 pb-2 bg-white rounded-xl border border-green-200">
                                <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
                                  <div>
                                    <span className="block text-xs text-gray-400 font-semibold mb-1">ORDER PLACED</span>
                                    <span className="text-sm font-medium text-gray-700">
                                      {(order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.timestamp || order.date)).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                      })}
                                    </span>
                                  </div>
                          <div>
                                    <span className="block text-xs text-gray-400 font-semibold mb-1">ORDER ID</span>
                                    <span className="text-sm font-medium text-gray-700">#{order.orderId || order.id?.slice(-8) || 'N/A'}</span>
                          </div>
                                  <div>
                                    <span className="block text-xs text-gray-400 font-semibold mb-1">STATUS</span>
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              <span className="capitalize">{order.status}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-500 mb-1">Total Amount</div>
                                  <div className="text-lg font-semibold text-green-600">
                                    ₹{calculateOrderTotal(order).toLocaleString('en-IN')}
                          </div>
                          </div>
                        </div>

                              {/* Order Items */}
                              <div className="mt-4">
                                <div className="bg-white rounded-lg p-4 space-y-2 border border-green-200">
                            {(order.items || order.cartItems || []).map((item, index) => (
                                    <div key={index} className="flex flex-wrap justify-between items-center gap-2 text-sm border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                      <div className="flex items-center gap-3">
                                        <img 
                                          src={item.imageUrl || 'placeholder.jpg'} 
                                          alt={item.title} 
                                          className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                        />
                                        <div>
                                          <span className="font-medium text-gray-900">{item.name || item.title}</span>
                                          <span className="text-gray-500 text-xs block">
                                            Qty: {item.quantity} {item.unit || ''}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="font-medium text-green-600">₹{Number(item.price).toLocaleString('en-IN')}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                              {/* Delivery Address */}
                              <div className="mt-4">
                                <div className="bg-white rounded-lg p-4 border border-green-200">
                                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-green-600" />
                                    Delivery Address
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {order.deliveryAddress || (order.addressInfo ? 
                                      `${order.addressInfo.name || ''}, ${order.addressInfo.houseNo || ''}, ${order.addressInfo.blockNo || ''}, ${order.addressInfo.landmark || ''}, ${order.addressInfo.address || ''}, ${order.addressInfo.pincode || ''}` 
                                      : 'N/A')}
                                  </p>
                                </div>
                        </div>

                              {/* Actions */}
                              <div className="flex flex-wrap gap-3 mt-4 pt-4">
                          <Link
                            to="/order"
                                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 min-w-[120px] shadow-sm hover:shadow"
                          >
                                  <Truck className="h-4 w-4" />
                            Track Order
                          </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Favorite Products
                  </h2>
                  <div className="text-sm text-gray-500">
                    {favoriteProducts.length} {favoriteProducts.length === 1 ? 'Item' : 'Items'}
                  </div>
                </div>
                {favoriteProducts.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart className="h-8 w-8 text-red-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
                    <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                      Start adding products to your favorites by clicking the heart icon on any product
                    </p>
                    <button
                      onClick={() => navigate('/allproducts')}
                      className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-sm touch-manipulation"
                    >
                      <ShoppingBag className="h-5 w-5 mr-2" />
                      Browse Products
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                    {favoriteProducts.map(item => (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-3 sm:p-4 cursor-pointer hover:shadow-2xl hover:scale-105 transition-all duration-200 touch-manipulation"
                        onClick={() => navigate(`/productinfo/${item.id}`)}
                      >
                        <div className="aspect-square mb-3 overflow-hidden rounded-xl">
                          <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-2">{item.title}</h3>
                          <p className="text-green-600 font-semibold text-sm sm:text-base">₹{item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="p-6">
                <div className="max-w-4xl mx-auto">
                  {/* Notifications Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BellRing className="h-5 w-5 text-green-600" />
                      Notification Preferences
                    </h3>
                    <div className="bg-white rounded-lg shadow p-4 space-y-4">
                      {Object.entries(settingsData.notifications).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                            <p className="text-sm text-gray-500">
                              {key === 'orderUpdates' && 'Receive updates about your orders'}
                              {key === 'promotions' && 'Get notified about special offers and deals'}
                              {key === 'newsletter' && 'Subscribe to our weekly newsletter'}
                              {key === 'stockAlerts' && 'Get alerts when your favorite items are back in stock'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('notifications', key, !value)}
                            className={`p-2 rounded-full transition-colors duration-200 ${
                              value ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {value ? <BellRing className="h-6 w-6" /> : <BellOff className="h-6 w-6" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Privacy Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      Privacy Settings
                    </h3>
                    <div className="bg-white rounded-lg shadow p-4 space-y-4">
                      
                      {Object.entries(settingsData.privacy)
                        .filter(([key]) => key !== 'profileVisibility')
                        .map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                              <p className="text-sm text-gray-500">
                                {key === 'showOrderHistory' && 'Allow others to see your order history'}
                                {key === 'showFavorites' && 'Make your favorite items visible to others'}
                              </p>
                            </div>
                            <button
                              onClick={() => handleSettingChange('privacy', key, !value)}
                              className="relative"
                            >
                              {value ? (
                                <ToggleRight className="h-6 w-6 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-6 w-6 text-gray-400" />
                              )}
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>

                  

                  {/* Security Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Lock className="h-5 w-5 text-green-600" />
                      Security
                    </h3>
                    <div className="bg-white rounded-lg shadow p-4 space-y-4">
                      {/* Password Change */}
                      <div>
                        <button
                          onClick={() => setShowPasswordChange(!showPasswordChange)}
                          className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                        >
                          <div>
                            <h4 className="font-medium">Change Password</h4>
                            <p className="text-sm text-gray-500">Update your account password</p>
                          </div>
                          <Lock className="h-5 w-5 text-gray-400" />
                        </button>
                        
                        {showPasswordChange && (
                          <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Current Password</label>
                              <input
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData(prev => ({
                                  ...prev,
                                  currentPassword: e.target.value
                                }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">New Password</label>
                              <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData(prev => ({
                                  ...prev,
                                  newPassword: e.target.value
                                }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                              <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData(prev => ({
                                  ...prev,
                                  confirmPassword: e.target.value
                                }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                              />
                            </div>
                            {passwordError && (
                              <p className="text-red-500 text-sm">{passwordError}</p>
                            )}
                            <div className="flex justify-end space-x-2">
                              <button
                                type="button"
                                onClick={() => setShowPasswordChange(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                              >
                                Update Password
                              </button>
                            </div>
                          </form>
                        )}
                      </div>

                      {/* Two-Factor Authentication */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Two-Factor Authentication</h4>
                          <p className="text-sm text-gray-500">Add an extra layer of security</p>
                        </div>
                        <button
                          onClick={() => handleSettingChange('security', 'twoFactorAuth', 
                            !settingsData.security.twoFactorAuth
                          )}
                          className="relative"
                        >
                          {settingsData.security.twoFactorAuth ? (
                            <ToggleRight className="h-6 w-6 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-gray-400" />
                          )}
                        </button>
                      </div>

                      {/* Login Alerts */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Login Alerts</h4>
                          <p className="text-sm text-gray-500">Get notified of new login attempts</p>
                        </div>
                        <button
                          onClick={() => handleSettingChange('security', 'loginAlerts', 
                            !settingsData.security.loginAlerts
                          )}
                          className="relative"
                        >
                          {settingsData.security.loginAlerts ? (
                            <ToggleRight className="h-6 w-6 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Danger Zone
                    </h3>
                    <div className="bg-red-50 rounded-lg shadow p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-red-700">Delete Account</h4>
                          <p className="text-sm text-red-600">
                            Permanently delete your account and all associated data
                          </p>
                        </div>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                        >
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Delete Account Confirmation Modal */}
                  {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-red-600 mb-4">Delete Account</h3>
                        <p className="text-gray-600 mb-4">
                          Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.
                        </p>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDeleteAccount}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                          >
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
} 