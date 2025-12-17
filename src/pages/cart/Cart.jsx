import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Leaf, ShoppingBag, ArrowLeft, MapPin, AlertCircle, Gift, X, CheckCircle } from 'lucide-react';
import { deleteFromCart, incrementQuantity, decrementQuantity, clearCart} from '../../redux/cartSlice';
import { toast } from 'react-toastify';
import { addDoc, collection, doc, getDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig.jsx';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/modal/Modal';
import myContext from '../../context/data/myContext';
import { Link } from '@tanstack/react-router';
import AuthModal from '../../components/auth/AuthModal';
import { useUserTracking } from '../../hooks/useUserTracking';
import { checkPinCodeValidity, validatePinCodeFormat } from '../../utils/pinCodeUtils';
import { validateCoupon, incrementCouponUsage } from '../../utils/couponUtils';
import DeliveryRequestModal from '../../components/DeliveryRequestModal';
import { sendOrderNotificationEmail } from '../../utils/emailService';

function Cart() {
  const { trackPage } = useUserTracking();
  const context = useContext(myContext);
  const { mode } = context;
  const dispatch = useDispatch();
  
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const cartItems = useSelector((state) => state.cart);
  
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalLeafyPieces, setTotalLeafyPieces] = useState(0);

  // Constants for quantity management
  const MIN_QUANTITY = 0.50;
  const QUANTITY_STEP = 0.50;

  // Constants for leafy vegetables
  const LEAFY_MIN_QUANTITY = 1;
  const LEAFY_QUANTITY_STEP = 1;

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userDetailsLoaded, setUserDetailsLoaded] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [landmark, setLandmark] = useState("");
  const [blockNo, setBlockNo] = useState("");
  const [showNotice, setShowNotice] = useState(false);
  const [city, setCity] = useState("");
  const [state, setState] = useState("Telangana");
  const [timingSettings, setTimingSettings] = useState({
    orderStartTime: '08:00',
    orderEndTime: '22:00',
    lateOrderCutoffTime: '21:00'
  });
  const [deliveryCharges, setDeliveryCharges] = useState(0);

  // Pin code validation states
  const [pinCodeValidation, setPinCodeValidation] = useState({
    isValid: null,
    area: null,
    isChecking: false
  });
  const [showDeliveryRequestModal, setShowDeliveryRequestModal] = useState(false);

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponValidation, setCouponValidation] = useState({
    isValid: null,
    error: null,
    isChecking: false
  });
  const [showCouponForm, setShowCouponForm] = useState(false);

  // Track page visit
  useEffect(() => {
    trackPage('cart');
  }, [trackPage]);

  useEffect(() => {
    let tempAmount = 0;
    let tempWeight = 0;
    let tempLeafyPieces = 0;

    cartItems.forEach((item) => {
      const itemPrice = Number(item.price) || 0;
      const itemQuantity = item.category === 'Leafy Vegetables' 
        ? parseInt(item.quantity || LEAFY_MIN_QUANTITY, 10)
        : Number(item.quantity || MIN_QUANTITY);

      // Calculate total amount based on category
      if (item.category === 'Leafy Vegetables') {
        tempLeafyPieces += itemQuantity;
        tempAmount += itemPrice * itemQuantity; // Price per piece for leafy vegetables
      } else {
        tempWeight += itemQuantity;
        tempAmount += itemPrice * itemQuantity; // Price per kg for regular vegetables
      }
    });

    setTotalAmount(Number(tempAmount.toFixed(2)));
    setTotalWeight(Number(tempWeight.toFixed(2)));
    setTotalLeafyPieces(tempLeafyPieces);
  }, [cartItems]);

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const grandTotal = Number(totalAmount) + Number(deliveryCharges) - Number(discountAmount);

  const deleteFromCartHandler = (item) => {
    dispatch(deleteFromCart(item));
    toast.success('Item removed from cart');
  };

  const handleIncrement = (item) => {
    if (item.category === 'Leafy Vegetables') {
      const newQuantity = Number(item.quantity || LEAFY_MIN_QUANTITY) + LEAFY_QUANTITY_STEP;
      let safeItem = { ...item, quantity: newQuantity };
      if (safeItem.time && safeItem.time.toDate) {
        safeItem.time = safeItem.time.toDate().toISOString();
      }
      dispatch({ type: 'cart/incrementQuantity', payload: safeItem });
    } else {
    const newQuantity = Number((Number(item.quantity || MIN_QUANTITY) + QUANTITY_STEP).toFixed(2));
    dispatch(incrementQuantity({ ...item, quantity: newQuantity }));
    }
  };

  const handleDecrement = (item) => {
    if (item.category === 'Leafy Vegetables') {
      const currentQuantity = Number(item.quantity || LEAFY_MIN_QUANTITY);
      if (currentQuantity > LEAFY_MIN_QUANTITY) {
        const newQuantity = currentQuantity - LEAFY_QUANTITY_STEP;
        let safeItem = { ...item, quantity: newQuantity };
        if (safeItem.time && safeItem.time.toDate) {
          safeItem.time = safeItem.time.toDate().toISOString();
        }
        dispatch({ type: 'cart/incrementQuantity', payload: safeItem });
      } else {
        dispatch(deleteFromCart(item));
        toast.success('Item removed from cart');
      }
    } else {
    const currentQuantity = Number(item.quantity || MIN_QUANTITY);
    if (currentQuantity > MIN_QUANTITY) {
      const newQuantity = Number((currentQuantity - QUANTITY_STEP).toFixed(2));
      dispatch(decrementQuantity({ ...item, quantity: newQuantity }));
    } else {
      dispatch(deleteFromCart(item));
      toast.success('Item removed from cart');
      }
    }
  };

  const buyNow = async () => {
    if (!name || !address || !pincode || !phoneNumber || !houseNo || !landmark || !blockNo) {
      toast.error("All fields are required", { position: "top-center", autoClose: 1000, theme: "colored" });
      return;
    }

    // Check pin code validation
    if (pinCodeValidation.isValid === false) {
      toast.error("Please enter a valid delivery pin code", { position: "top-center", autoClose: 2000, theme: "colored" });
      return;
    }

    if (pinCodeValidation.isChecking) {
      toast.error("Please wait while we validate your pin code", { position: "top-center", autoClose: 2000, theme: "colored" });
      return;
    }
  
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const userId = userData?.user?.uid;
      
      const addressInfo = {
        name,
        address,
        pincode,
        phoneNumber,
        houseNo,
        landmark,
        blockNo,
        date: new Date().toLocaleString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })
      };
  
      // Generate custom orderId
      const now = new Date();
      const year = now.getFullYear();
      const date = String(now.getDate()).padStart(2, '0');
      const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      // Query for today's orders to get the count
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const ordersRef = collection(fireDB, "orders");
      const q = query(
        ordersRef,
        where("timestamp", ">=", Timestamp.fromDate(startOfDay)),
        where("timestamp", "<=", Timestamp.fromDate(endOfDay))
      );
      const snapshot = await getDocs(q);
      const orderCount = snapshot.size + 1;
      const number = String(orderCount).padStart(5, '0');
      const orderId = `${year}${date}${month}${number}`;
  
      // Add order to Firebase
      const orderData = { 
        ...addressInfo, 
        cartItems, 
        totalAmount, 
        deliveryCharges,
        discountAmount: appliedCoupon ? appliedCoupon.discountAmount : 0,
        appliedCoupon: appliedCoupon ? {
          code: appliedCoupon.coupon.code,
          type: appliedCoupon.coupon.type,
          value: appliedCoupon.coupon.value,
          description: appliedCoupon.coupon.description
        } : null,
        grandTotal,
        userid: userId, // Add user ID to track orders
        timestamp: Timestamp.fromDate(now),
        orderId // Store the custom orderId
      };
      
      await addDoc(collection(fireDB, "orders"), orderData);
      
      // Increment coupon usage if coupon was applied
      if (appliedCoupon) {
        await incrementCouponUsage(appliedCoupon.coupon.id);
      }
      
      // Track user order activity if user is logged in
      if (userId && context.trackUserActivity) {
        await context.trackUserActivity(userId, 'order_placed', { amount: grandTotal });
      }
      
      // Send email notification to admins (non-blocking)
      sendOrderNotificationEmail({
        ...orderData,
        addressInfo,
        email: userEmail
      }).catch(error => {
        console.error('Failed to send order notification email:', error);
        // Don't show error to user - email failure shouldn't affect order placement
      });
      
      toast.success("Order placed successfully!");
  
      dispatch(clearCart());
      localStorage.removeItem('cart');
    } catch (error) {
      console.error("Order placement error:", error);
      toast.error("Failed to place order. Please try again.");
    }
  };
  
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Fetch user details if logged in
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const uid = user?.user?.uid;
        setUserId(uid);
        setUserEmail(user?.user?.email || "");
        if (uid) {
          // Fetch user details from Firestore
          const fetchUserDetails = async () => {
            const userRef = doc(fireDB, 'users', uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const data = userSnap.data();
              setName(data.name || "");
              setAddress(data.address || "");
              setPincode(data.pincode || "");
              setPhoneNumber(data.phone || "");
              setHouseNo(data.houseNo || "");
              setLandmark(data.landmark || "");
              setBlockNo(data.blockNo || "");
            }
            setUserDetailsLoaded(true);
          };
          fetchUserDetails();
        }
      } catch (err) {
        setUserDetailsLoaded(true);
      }
    } else {
      setUserDetailsLoaded(true);
    }
    // Show order timing notice only once per session
    if (!sessionStorage.getItem('orderNoticeAccepted')) {
      setShowNotice(true);
    }
  }, []);

  // Handler for Order Now button
  const handleOrderNow = () => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      setShowLoginModal(true);
      return;
    }
    // If any required field is missing, prompt user to fill
    if (!name || !address || !pincode || !phoneNumber || !houseNo || !landmark || !blockNo) {
      toast.error("Please fill all delivery details", { position: "top-center", autoClose: 1500, theme: "colored" });
      return;
    }

    // Check pin code validation
    if (pinCodeValidation.isValid === false) {
      toast.error("Please enter a valid delivery pin code", { position: "top-center", autoClose: 2000, theme: "colored" });
      return;
    }

    if (pinCodeValidation.isChecking) {
      toast.error("Please wait while we validate your pin code", { position: "top-center", autoClose: 2000, theme: "colored" });
      return;
    }

    // All details present, show confirmation modal
    setShowConfirmModal(true);
  };

  // Handler for confirming order
  const handleConfirmOrder = async () => {
    setShowConfirmModal(false);
    await buyNow();
  };

  const handleNoticeOkay = () => {
    setShowNotice(false);
    sessionStorage.setItem('orderNoticeAccepted', 'true');
  };

  // Pin code validation function
  const validatePinCode = async (pinCodeValue) => {
    if (!pinCodeValue || pinCodeValue.length !== 6) {
      setPinCodeValidation({
        isValid: false,
        area: null,
        isChecking: false
      });
      return;
    }

    setPinCodeValidation(prev => ({ ...prev, isChecking: true }));

    try {
      const result = await checkPinCodeValidity(pinCodeValue);
      setPinCodeValidation({
        isValid: result.isValid,
        area: result.area,
        isChecking: false
      });
    } catch (error) {
      console.error('Error validating pin code:', error);
      setPinCodeValidation({
        isValid: false,
        area: null,
        isChecking: false
      });
    }
  };

  // Handle pin code change
  const handlePinCodeChange = (value) => {
    setPincode(value);
    
    // Clear validation when pin code is empty
    if (!value) {
      setPinCodeValidation({
        isValid: null,
        area: null,
        isChecking: false
      });
      return;
    }

    // Validate pin code format first
    const formatValidation = validatePinCodeFormat(value);
    if (!formatValidation.isValid) {
      setPinCodeValidation({
        isValid: false,
        area: null,
        isChecking: false
      });
      return;
    }

    // Check if pin code is valid for delivery
    validatePinCode(value);
  };

  // Coupon validation function
  const handleCouponValidation = async () => {
    if (!couponCode.trim()) {
      setCouponValidation({
        isValid: false,
        error: 'Please enter a coupon code',
        isChecking: false
      });
      return;
    }

    setCouponValidation(prev => ({ ...prev, isChecking: true }));

    try {
      const result = await validateCoupon(couponCode, totalAmount);
      
      if (result.isValid) {
        setAppliedCoupon(result);
        setCouponValidation({
          isValid: true,
          error: null,
          isChecking: false
        });
        toast.success(result.message);
      } else {
        setCouponValidation({
          isValid: false,
          error: result.error,
          isChecking: false
        });
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      setCouponValidation({
        isValid: false,
        error: 'Failed to validate coupon',
        isChecking: false
      });
    }
  };

  // Remove applied coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponValidation({
      isValid: null,
      error: null,
      isChecking: false
    });
    setShowCouponForm(false);
    toast.success('Coupon removed');
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Fetch timing settings
        const timingDoc = await getDoc(doc(fireDB, 'settings', 'timing'));
        if (timingDoc.exists()) {
          setTimingSettings(timingDoc.data());
        }

        // Fetch delivery charges
        const chargesDoc = await getDoc(doc(fireDB, 'settings', 'deliveryCharges'));
        if (chargesDoc.exists()) {
          setDeliveryCharges(Number(chargesDoc.data().value) || 0);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pt-24" style={{ 
        backgroundColor: mode === 'dark' ? '#282c34' : '', 
        color: mode === 'dark' ? 'white' : '' 
      }}>
        {/* Header */}
        <div className="bg-gray-50 shadow-sm mb-6" style={{ 
          backgroundColor: mode === 'dark' ? '#282c34' : ''
        }}>
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Continue Shopping</span>
              </Link>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-green-600" />
                <h1 className="text-lg font-semibold">Shopping Cart</h1>
              </div>
              <div className="w-20 sm:w-32"></div> {/* Spacer for balance */}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 pb-8">
          <div className="lg:flex lg:gap-6">
            {/* Cart Items Section */}
            <div className="lg:w-2/3">
              {cartItems.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg shadow-sm" style={{
                  backgroundColor: mode === 'dark' ? 'rgb(32 33 34)' : ''
                }}>
                  <ShoppingBag className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <h2 className="text-lg font-semibold mb-2">Your cart is empty</h2>
                  <p className="text-sm text-gray-500 mb-4" style={{ color: mode === 'dark' ? '#999' : '' }}>
                    Add some fresh vegetables to your cart
                  </p>
                  <Link 
                    to="/allproducts"
                    className="inline-block bg-green-500 text-white px-5 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    Browse Products
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="rounded-lg shadow-sm p-3 flex items-center gap-3 bg-green-50 dark:bg-green-100" style={{
                      color: mode === 'dark' ? 'white' : ''
                    }}>
                      {/* Image */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 relative flex-shrink-0">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover rounded-lg"
                        />
                        {item.isCleaned && (
                          <span className="absolute -top-1 -right-1 bg-green-100 text-green-800 text-xs font-medium px-1.5 py-0.5 rounded-full">
                            Clean
                          </span>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-medium text-sm sm:text-base truncate">{item.title}</h3>
                            <p className="text-xs sm:text-sm text-gray-600 truncate" style={{ color: mode === 'dark' ? '#999' : '' }}>
                              {item.isCleaned ? 'Cleaned and Ready to Cook' : 'Fresh from Farm'}
                            </p>
                          </div>
                          <button 
                            onClick={() => deleteFromCartHandler(item)}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 transition-colors flex-shrink-0"
                            style={{ backgroundColor: mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '' }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="mt-2 sm:mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {item.category === 'Leafy Vegetables' ? (
                              <select
                                className="w-32 px-3 py-2 rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent font-semibold text-gray-900"
                                value={parseInt(item.quantity || LEAFY_MIN_QUANTITY, 10)}
                                onChange={e => {
                                  const newQuantity = Number(e.target.value);
                                  let safeItem = { ...item, quantity: newQuantity };
                                  if (safeItem.time && safeItem.time.toDate) {
                                    safeItem.time = safeItem.time.toDate().toISOString();
                                  }
                                  dispatch({ type: 'cart/incrementQuantity', payload: safeItem });
                                }}
                              >
                                {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                                  <option key={num} value={num}>{num} piece{num > 1 ? 's' : ''}</option>
                                ))}
                              </select>
                            ) : (
                              <>
                              <button 
                                onClick={() => handleDecrement(item)}
                                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                                style={{ backgroundColor: mode === 'dark' ? '#444' : '' }}
                              >
                                -
                              </button>
                              <span className="w-16 sm:w-20 text-center text-sm sm:text-base">
                                {`${Number(item.quantity || MIN_QUANTITY).toFixed(2)}kg`}
                              </span>
                              <button 
                                onClick={() => handleIncrement(item)}
                                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                                style={{ backgroundColor: mode === 'dark' ? '#444' : '' }}
                              >
                                +
                              </button>
                              </>
                            )}
                          </div>
                          <div className="flex flex-col items-end">
                            {item.actualprice > item.price && (
                              <p className="text-xs sm:text-sm text-gray-500 line-through">
                                {item.category === 'Leafy Vegetables'
                                  ? `${parseInt(item.quantity, 10)} x ₹${Number(item.actualprice)} = ₹${(parseInt(item.quantity, 10) * Number(item.actualprice)).toFixed(2)}`
                                  : `₹${(Number(item.actualprice) * Number(item.quantity || MIN_QUANTITY)).toFixed(2)}`}
                              </p>
                            )}
                            {item.category === 'Leafy Vegetables' ? (
                              <p className="font-medium text-sm sm:text-base">
                                {parseInt(item.quantity, 10)} x ₹{Number(item.price)} = ₹{(parseInt(item.quantity, 10) * Number(item.price)).toFixed(2)}
                              </p>
                            ) : (
                              <p className="font-medium text-sm sm:text-base">
                                ₹{(Number(item.price) * Number(item.quantity || MIN_QUANTITY)).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order Summary Section - Only show when cart has items */}
            {cartItems.length > 0 && (
              <div className="lg:w-1/3 mt-6 lg:mt-0">
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 sticky top-[84px]" style={{
                  backgroundColor: mode === 'dark' ? 'rgb(32 33 34)' : '',
                  color: mode === 'dark' ? 'white' : ''
                }}>
                  <h2 className="text-lg sm:text-xl font-semibold mb-4">Order Summary</h2>
                  
                  {/* Individual Product Summary */}
                  <div className="mb-4">
                    <h3 className="text-base font-semibold mb-2">Individual Product Summary</h3>
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {cartItems.map((item) => (
                        <li key={item.id} className="py-2 flex items-center justify-between">
                          {/* Product Name */}
                          <span className="truncate max-w-[120px] flex-1" title={item.title}>{item.title}</span>
                          {/* Quantity/Weight */}
                          <span className="w-24 text-center">
                            {item.category === 'Leafy Vegetables'
                              ? `${parseInt(item.quantity || LEAFY_MIN_QUANTITY, 10)} piece${parseInt(item.quantity || LEAFY_MIN_QUANTITY, 10) > 1 ? 's' : ''}`
                              : `${Number(item.quantity || MIN_QUANTITY).toFixed(2)} kg`}
                          </span>
                          {/* Price */}
                          <span className="w-28 text-right font-medium">
                            ₹{((item.category === 'Leafy Vegetables' 
                              ? parseInt(item.quantity || LEAFY_MIN_QUANTITY, 10) 
                              : Number(item.quantity || MIN_QUANTITY)) * Number(item.price)).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Coupon Section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        <Gift className="w-4 h-4 text-purple-600" />
                        Coupon Code
                      </h3>
                      {!showCouponForm && !appliedCoupon && (
                        <button
                          onClick={() => setShowCouponForm(true)}
                          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          + Add Coupon
                        </button>
                      )}
                    </div>

                    {/* Applied Coupon Display */}
                    {appliedCoupon && (
                      <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <div className="font-semibold text-green-800">{appliedCoupon.coupon.code}</div>
                              <div className="text-sm text-green-600">{appliedCoupon.coupon.description}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-green-800">-₹{appliedCoupon.discountAmount.toFixed(2)}</div>
                            <button
                              onClick={handleRemoveCoupon}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Coupon Input Form */}
                    {showCouponForm && !appliedCoupon && (
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 mb-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Gift className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-purple-800">Enter Coupon Code</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                              className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none transition-all ${
                                couponValidation.isValid === true ? 'border-green-500 bg-green-50' :
                                couponValidation.isValid === false ? 'border-red-500 bg-red-50' :
                                'border-gray-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-200'
                              }`}
                              placeholder="Enter coupon code"
                              disabled={couponValidation.isChecking}
                            />
                            {couponValidation.isChecking && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                            {couponValidation.isValid === true && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                                <CheckCircle className="w-4 h-4" />
                              </div>
                            )}
                            {couponValidation.isValid === false && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                                <X className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <button
                            onClick={handleCouponValidation}
                            disabled={couponValidation.isChecking || !couponCode.trim()}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {couponValidation.isChecking ? '...' : 'Apply'}
                          </button>
                        </div>
                        
                        {couponValidation.error && (
                          <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                            <X className="w-3 h-3" />
                            {couponValidation.error}
                          </div>
                        )}
                        
                        <div className="mt-3 flex justify-between items-center">
                          <button
                            onClick={() => {
                              setShowCouponForm(false);
                              setCouponCode('');
                              setCouponValidation({
                                isValid: null,
                                error: null,
                                isChecking: false
                              });
                            }}
                            className="text-sm text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Overall Summary */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600" style={{ color: mode === 'dark' ? '#999' : '' }}>Subtotal</span>
                      <span>₹{totalAmount.toFixed(2)}</span>
                    </div>
                    {deliveryCharges > 0 && (
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="text-gray-600" style={{ color: mode === 'dark' ? '#999' : '' }}>Delivery Charges</span>
                        <span>₹{deliveryCharges.toFixed(2)}</span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="text-gray-600" style={{ color: mode === 'dark' ? '#999' : '' }}>Discount</span>
                        <span className="text-green-600">-₹{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {totalWeight > 0 && (
                      <div className="flex justify-between text-sm sm:text-base items-center">
                        <span className="text-gray-600" style={{ color: mode === 'dark' ? '#999' : '' }}>Total Weight (Vegetables)</span>
                        <span>{totalWeight.toFixed(2)} kg</span>
                      </div>
                    )}
                    {totalLeafyPieces > 0 && (
                      <div className="flex justify-between text-sm sm:text-base items-center">
                        <span className="text-gray-600" style={{ color: mode === 'dark' ? '#999' : '' }}>Leafy Vegetables</span>
                        <span>{totalLeafyPieces} {totalLeafyPieces === 1 ? 'piece' : 'pieces'}</span>
                      </div>
                    )}
                    <div className="h-px bg-gray-200 my-3" style={{ backgroundColor: mode === 'dark' ? '#374151' : '' }}></div>
                    <div className="flex justify-between text-base sm:text-lg font-semibold">
                      <span>Total</span>
                      <span>₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <Modal
                    name={name}
                    address={address}
                    pincode={pincode}
                    phoneNumber={phoneNumber}
                    setName={setName}
                    setAddress={setAddress}
                    setPincode={setPincode}
                    setPhoneNumber={setPhoneNumber}
                    cartItems={cartItems}
                    totalAmount={totalAmount}
                    houseNo={houseNo}
                    setHouseNo={setHouseNo}
                    landmark={landmark}
                    setLandmark={setLandmark}
                    blockNo={blockNo}
                    setBlockNo={setBlockNo}
                    userEmail={userEmail}
                    city={city}
                    setCity={setCity}
                    state={state}
                    setState={setState}
                    pinCodeValidation={pinCodeValidation}
                    onPinCodeChange={handlePinCodeChange}
                    onDeliveryRequest={(pinCode) => setShowDeliveryRequestModal(true)}
                    appliedCoupon={appliedCoupon}
                    discountAmount={discountAmount}
                  />
                  
                 
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <AuthModal isOpen={showLoginModal} closeModal={() => setShowLoginModal(false)} initialMode="login" />
      
      {/* Delivery Request Modal */}
      <DeliveryRequestModal
        isOpen={showDeliveryRequestModal}
        onClose={() => setShowDeliveryRequestModal(false)}
        pinCode={pincode}
        area=""
      />
      
      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
            <h2 className="text-3xl font-extrabold mb-4 text-green-700 bg-gradient-to-r from-pink-400 via-green-400 to-blue-400 bg-clip-text text-transparent">Complete Your Order</h2>
            <div className="mb-6 text-left space-y-2">
              <div><strong>Name:</strong> {name}</div>
              <div><strong>Phone:</strong> {phoneNumber}</div>
              <div><strong>Email:</strong> {userEmail}</div>
              <div><strong>Address:</strong> {address}</div>
              <div><strong>House/Door/Flat No:</strong> {houseNo}</div>
              <div><strong>Block No/Road No:</strong> {blockNo}</div>
              <div><strong>Landmark:</strong> {landmark}</div>
              <div><strong>Pincode:</strong> {pincode}</div>
            </div>
            <div className="mb-4 text-gray-600">Please confirm your details before proceeding.</div>
            <button onClick={handleConfirmOrder} className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition">Confirm & Place Order</button>
            <button onClick={() => setShowConfirmModal(false)} className="ml-4 px-6 py-2 rounded-lg font-semibold border border-gray-300 hover:bg-gray-100 transition">Cancel</button>
          </div>
        </div>
      )}
      {/* Order Timing Notice Modal */}
      {showNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Blurred overlay */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-2xl px-8 py-6 max-w-md w-full text-center border-2 border-green-600">
            <div className="text-green-700 text-lg font-semibold mb-2">
              Order Times: {timingSettings.orderStartTime} – {timingSettings.orderEndTime}
            </div>
            <div className="text-gray-700 mb-4">
              Orders placed after {timingSettings.lateOrderCutoffTime} will be delivered with the next day's harvest.
            </div>
            <button onClick={handleNoticeOkay} className="mt-2 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
              Accept
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Cart;