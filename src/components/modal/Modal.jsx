import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect } from 'react'
import { addDoc, collection, doc, getDoc, updateDoc, query, orderBy, limit, getDocs, where } from 'firebase/firestore'
import { fireDB } from '../../firebase/FirebaseConfig'
import { toast } from 'react-toastify'
import { useDispatch } from 'react-redux'
import { clearCart } from '../../redux/cartSlice'
import { incrementCouponUsage } from '../../utils/couponUtils'
import { sendOrderNotificationEmail } from '../../utils/emailService'

export default function Modal({ name, address, pincode, phoneNumber, setName, setAddress, setPincode, setPhoneNumber, cartItems = [], totalAmount, houseNo, setHouseNo, landmark, setLandmark, blockNo, setBlockNo, userEmail, city, setCity, state, setState, pinCodeValidation, onPinCodeChange, onDeliveryRequest, appliedCoupon, discountAmount }) {
    const [isOpen, setIsOpen] = useState(false)
    const dispatch = useDispatch()
    const [deliveryCharges, setDeliveryCharges] = useState(0)
    const [errors, setErrors] = useState({})
    const [alternatePhone, setAlternatePhone] = useState("")
    const [isPhoneLogin, setIsPhoneLogin] = useState(false)
    const [localEmail, setLocalEmail] = useState("")

    useEffect(() => {
        const fetchDeliveryCharges = async () => {
            try {
                const docRef = doc(fireDB, 'settings', 'deliveryCharges')
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    setDeliveryCharges(Number(docSnap.data().value) || 0)
                }
            } catch (err) {
                setDeliveryCharges(0)
            }
        }
        fetchDeliveryCharges()
    }, [])

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'))?.user;
        // Check if user logged in with phone (no email)
        const isPhoneUser = !user?.email;
        setIsPhoneLogin(isPhoneUser);
        
        // Initialize email state
        if (isPhoneUser) {
            setLocalEmail(""); // Clear email for phone users
        } else {
            setLocalEmail(user?.email || ""); // Set email from user data
        }
    }, [])

    const grandTotal = Number(totalAmount) + Number(deliveryCharges)
    const subtotal = Number(totalAmount)

    function closeModal() {
        setIsOpen(false)
        setErrors({})
    }

    function openModal() {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData?.user?.uid) {
            toast.info('Please login to continue.', {
                position: "top-center",
                autoClose: 2000,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: "colored",
            });
           
            return;
        }
        setIsOpen(true);
    }

    // Validation helpers
    const isOnlyAlphabets = (str) => /^[A-Za-z ]+$/.test(str.trim());
    const isValidPhone = (str) => {
        // Remove any non-numeric characters
        const cleanPhone = str.replace(/\D/g, '');
        
        // Check if exactly 10 digits
        if (cleanPhone.length !== 10) return false;
        
        // Check if starts with 6, 7, 8, or 9
        if (!/^[6789]/.test(cleanPhone)) return false;
        
        // Check for repeated digits (e.g., 1111111111, 2222222222, ...)
        if (/^([0-9])\1{9}$/.test(cleanPhone)) return false;
        
        // Check for sequential numbers (e.g., 1234567890, 9876543210)
        if (/0123456789|1234567890|9876543210|0987654321/.test(cleanPhone)) return false;
        
        return true;
    };
    const isValidPincode = (str) => /^5[0-9]{5}$/.test(str);
    const isNotEmpty = (str) => str && str.trim().length > 0;
    
    // Check for invalid placeholder values like "NA", "N/A", etc.
    const isValidValue = (str) => {
        if (!str) return false;
        const trimmed = str.trim().toLowerCase();
        const invalidValues = ['na', 'n/a', 'not applicable', 'none', 'null', 'undefined', 'test', 'demo'];
        return !invalidValues.includes(trimmed);
    };
    
    const isValidAlternatePhone = (str) => {
        if (!str) return true; // optional
        // Remove any non-numeric characters
        const cleanPhone = str.replace(/\D/g, '');
        
        // Check if exactly 10 digits
        if (cleanPhone.length !== 10) return false;
        
        // Check if starts with 6, 7, 8, or 9
        if (!/^[6789]/.test(cleanPhone)) return false;
        
        // Check for repeated digits
        if (/^([0-9])\1{9}$/.test(cleanPhone)) return false;
        
        // Check for sequential numbers
        if (/0123456789|1234567890|9876543210|0987654321/.test(cleanPhone)) return false;
        
        // Check if different from primary number
        if (cleanPhone === phoneNumber.replace(/\D/g, '')) return false;
        
        return true;
    };

    // Add email validation
    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const validateFields = () => {
        const newErrors = {};
        
        // Name validation
        if (!isNotEmpty(name)) {
            newErrors.name = 'Please enter your full name.';
        } else if (!isValidValue(name)) {
            newErrors.name = 'Please enter a valid name. "NA", "N/A", and similar placeholder values are not allowed.';
        } else if (!isOnlyAlphabets(name)) {
            newErrors.name = 'Please enter a valid name using only letters and spaces.';
        }
        
        // Phone number validation
        if (!isNotEmpty(phoneNumber)) {
            newErrors.phoneNumber = 'Please enter your 10-digit mobile number.';
        } else if (!isValidPhone(phoneNumber)) {
            newErrors.phoneNumber = 'Please enter exactly 10 digits starting with 6, 7, 8, or 9. Sequential numbers and repeated digits are not allowed.';
        }
        
        // Email validation for phone login users
        if (isPhoneLogin) {
            if (!isNotEmpty(localEmail)) {
                newErrors.email = 'Email is required.';
            } else if (!isValidValue(localEmail)) {
                newErrors.email = 'Please enter a valid email address. "NA", "N/A", and similar placeholder values are not allowed.';
            } else if (!isValidEmail(localEmail)) {
                newErrors.email = 'Please enter a valid email address.';
            }
        }

        // Address validation
        if (!isNotEmpty(houseNo)) {
            newErrors.houseNo = 'Please enter your house, door, or flat number.';
        } else if (!isValidValue(houseNo)) {
            newErrors.houseNo = 'Please enter a valid house/door/flat number. "NA", "N/A", and similar placeholder values are not allowed.';
        }
        
        if (!isNotEmpty(blockNo)) {
            newErrors.blockNo = 'Please enter your road or block number.';
        } else if (!isValidValue(blockNo)) {
            newErrors.blockNo = 'Please enter a valid road/block number. "NA", "N/A", and similar placeholder values are not allowed.';
        }
        
        if (!isNotEmpty(landmark)) {
            newErrors.landmark = 'Please provide a landmark to help us find your address.';
        } else if (!isValidValue(landmark)) {
            newErrors.landmark = 'Please enter a valid landmark. "NA", "N/A", and similar placeholder values are not allowed.';
        }
        
        if (!isNotEmpty(address)) {
            newErrors.address = 'Please enter your street and area.';
        } else if (!isValidValue(address)) {
            newErrors.address = 'Please enter a valid address. "NA", "N/A", and similar placeholder values are not allowed.';
        }
        
        // Pincode validation
        if (!isNotEmpty(pincode)) {
            newErrors.pincode = 'Please enter your 6-digit pincode.';
        } else if (!isValidPincode(pincode)) {
            newErrors.pincode = 'Pincode must be exactly 6 digits and start with 5 (e.g., 500001).';
        } else if (pinCodeValidation && pinCodeValidation.isValid === false) {
            newErrors.pincode = 'We do not deliver to this area. Please request delivery to this area or choose a different location.';
        }
        
        // City validation
        if (!isNotEmpty(city)) {
            newErrors.city = 'Please enter your city.';
        } else if (!isValidValue(city)) {
            newErrors.city = 'Please enter a valid city name. "NA", "N/A", and similar placeholder values are not allowed.';
        }
        
        // Alternate phone validation
        if (alternatePhone && !isValidAlternatePhone(alternatePhone)) {
            newErrors.alternatePhone = 'Please enter exactly 10 digits starting with 6, 7, 8, or 9. Sequential numbers and repeated digits are not allowed. Must be different from primary number.';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const generateOrderId = async () => {
        const now = new Date();
        const year = now.getFullYear();
        const date = String(now.getDate()).padStart(2, '0');
        const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        // Query Firestore for the highest order number for this year/month/date
        const prefix = `NAV${year}${date}${month}`;
        const ordersRef = collection(fireDB, 'orders');
        const q = query(
            ordersRef,
            where('orderId', '>=', prefix),
            where('orderId', '<', prefix + 'Z'),
            orderBy('orderId', 'desc'),
            limit(1)
        );
        const snapshot = await getDocs(q);
        let nextNum = 1;
        if (!snapshot.empty) {
            const lastOrderId = snapshot.docs[0].data().orderId;
            const match = lastOrderId && lastOrderId.match(/(\d{5})$/);
            if (match) {
                nextNum = parseInt(match[1], 10) + 1;
            }
        }
        const numStr = String(nextNum).padStart(5, '0');
        return `${prefix}${numStr}`;
    };

    const handleOrderNow = async () => {
        if (!validateFields()) return;
        
        // Use localEmail for phone login users, otherwise use userEmail
        const emailToUse = isPhoneLogin ? localEmail : userEmail;

        const orderId = await generateOrderId();
        const orderInfo = {
            orderId,
            cartItems: cartItems.map(item => ({
                ...item,
                quantity: item.quantity
            })),
            addressInfo: {
                name,
                address,
                pincode,
                phoneNumber,
                alternatePhone,
                houseNo,
                landmark,
                blockNo,
                city: city || "",
                state: state || "",
                date: new Date().toLocaleString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                })
            },
            date: new Date().toLocaleString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
            }),
            timestamp: new Date().toISOString(),
            email: emailToUse,
            userid: JSON.parse(localStorage.getItem("user"))?.user?.uid,
            paymentMethod: "Cash on Delivery",
            status: "placed",
            subtotal,
            deliveryCharges,
            discountAmount: discountAmount || 0,
            appliedCoupon: appliedCoupon ? {
                code: appliedCoupon.coupon.code,
                type: appliedCoupon.coupon.type,
                value: appliedCoupon.coupon.value,
                description: appliedCoupon.coupon.description
            } : null,
            grandTotal: grandTotal - (discountAmount || 0),
            totalAmount: grandTotal - (discountAmount || 0)
        }

        try {
            const orderRef = collection(fireDB, 'orders')
            await addDoc(orderRef, orderInfo)
            
            // Increment coupon usage if coupon was applied
            if (appliedCoupon) {
                await incrementCouponUsage(appliedCoupon.coupon.id);
            }
            
            // Update user profile with latest delivery details
            const userId = JSON.parse(localStorage.getItem("user"))?.user?.uid;
            if (userId) {
                const userRef = doc(fireDB, 'users', userId);
                await updateDoc(userRef, {
                    name,
                    address,
                    pincode,
                    phone: phoneNumber,
                    alternatePhone,
                    houseNo,
                    landmark,
                    blockNo,
                    city: city || "",
                    state: state || "",
                });
            }

            // Send email notification to admins (non-blocking)
            sendOrderNotificationEmail({
                ...orderInfo,
                email: emailToUse
            }).catch(error => {
                console.error('Failed to send order notification email:', error);
                // Don't show error to user - email failure shouldn't affect order placement
            });
            
            dispatch(clearCart())
            setName("")
            setAddress("")
            setPincode("")
            setPhoneNumber("")
            setHouseNo("")
            setLandmark("")
            setBlockNo("")
            toast.success('Order placed successfully')
            closeModal()
        } catch (error) {
            console.log(error)
            toast.error('Failed to place order')
        }
    }

    return (
        <>
            <div className="text-center rounded-lg text-white font-bold">
                <button
                    type="button"
                    onClick={openModal}
                    className="w-full bg-violet-600 py-2 text-center rounded-lg text-white font-bold"
                >
                    Order Now
                </button>
            </div>

            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={closeModal}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto flex items-center justify-center mt-16 sm:mt-24">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-lg sm:max-h-[90vh] max-h-[95vh] transform overflow-hidden rounded-2xl p-0 text-left align-middle shadow-2xl transition-all bg-white flex flex-col">
                                    <div className="bg-gradient-to-r from-green-100 via-blue-50 to-pink-100 p-6 rounded-t-2xl border-b border-gray-200">
                                    <Dialog.Title
                                        as="h3"
                                            className="text-2xl font-extrabold leading-6 text-green-700 mb-1 bg-gradient-to-r from-pink-400 via-green-400 to-blue-400 bg-clip-text text-transparent"
                                    >
                                        Complete Your Order
                                    </Dialog.Title>
                                        <p className="text-sm text-gray-600">Please fill in your delivery details below.</p>
                                    </div>
                                    <div className="overflow-y-auto px-6 py-4 flex-1 scrollbar-thin">
                                        <form className="space-y-6">
                                            <div>
                                                <h4 className="text-lg font-semibold text-gray-800 mb-2">Personal Details</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="flex flex-col">
                                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                                            Full Name <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-2 text-green-500">
                                                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" fill="currentColor"/></svg>
                                                            </span>
                                                            <input
                                                                type="text"
                                                                name="name"
                                                                id="name"
                                                                value={name}
                                                                onChange={(e) => setName(e.target.value)}
                                                                className="pl-8 pr-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                                                                placeholder="Full Name"
                                                            />
                                                        </div>
                                                        {errors.name && <span className="text-xs text-red-600 mt-1">{errors.name}</span>}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                                                            Phone Number <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-2 text-green-500">
                                                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.35.27 2.67.76 3.88a1 1 0 01-.21 1.11l-2.2 2.2z" fill="currentColor"/></svg>
                                                            </span>
                                                            <input
                                                                type="tel"
                                                                name="phoneNumber"
                                                                id="phoneNumber"
                                                                value={phoneNumber}
                                                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                                className="pl-8 pr-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                                                                placeholder="10-digit mobile number"
                                                                maxLength="10"
                                                            />
                                                        </div>
                                                        {errors.phoneNumber && <span className="text-xs text-red-600 mt-1">{errors.phoneNumber}</span>}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label htmlFor="alternatePhone" className="block text-sm font-medium text-gray-700 mb-1">
                                                            Alternate Phone Number
                                                        </label>
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-2 text-green-500">
                                                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.35.27 2.67.76 3.88a1 1 0 01-.21 1.11l-2.2 2.2z" fill="currentColor"/></svg>
                                                            </span>
                                                            <input
                                                                type="tel"
                                                                name="alternatePhone"
                                                                id="alternatePhone"
                                                                value={alternatePhone}
                                                                onChange={e => setAlternatePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                                className="pl-8 pr-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                                                                placeholder="10-digit mobile number"
                                                                maxLength="10"
                                                            />
                                                        </div>
                                                        {errors.alternatePhone && <span className="text-xs text-red-600 mt-1">{errors.alternatePhone}</span>}
                                                    </div>
                                                    <div className="flex flex-col sm:col-span-2">
                                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                                            Email <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-2 text-green-500">
                                                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 2v.01L12 13 4 6.01V6h16zM4 20V8.99l8 6.99 8-6.99V20H4z" fill="currentColor"/></svg>
                                                            </span>
                                                            <input
                                                                type="email"
                                                                name="email"
                                                                id="email"
                                                                value={isPhoneLogin ? localEmail : userEmail}
                                                                onChange={(e) => isPhoneLogin ? setLocalEmail(e.target.value) : null}
                                                                disabled={!isPhoneLogin}
                                                                className={`pl-8 pr-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 ${!isPhoneLogin ? 'bg-gray-100' : 'bg-white'}`}
                                                                placeholder="Email"
                                                            />
                                                        </div>
                                                        {errors.email && <span className="text-xs text-red-600 mt-1">{errors.email}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-semibold text-gray-800 mb-2 mt-4">Address Details</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="flex flex-col">
                                                        <label htmlFor="houseNo" className="block text-sm font-medium text-gray-700 mb-1">
                                                            House/Door/Flat No <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="houseNo"
                                                            id="houseNo"
                                                            value={houseNo}
                                                            onChange={(e) => setHouseNo(e.target.value)}
                                                            className="pl-3 pr-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                                                            placeholder="House/Door/Flat No"
                                                        />
                                                        {errors.houseNo && <span className="text-xs text-red-600 mt-1">{errors.houseNo}</span>}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label htmlFor="blockNo" className="block text-sm font-medium text-gray-700 mb-1">
                                                            Road/Block No <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="blockNo"
                                                            id="blockNo"
                                                            value={blockNo}
                                                            onChange={(e) => setBlockNo(e.target.value)}
                                                            className="pl-3 pr-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                                                            placeholder="Road/Block No"
                                                        />
                                                        {errors.blockNo && <span className="text-xs text-red-600 mt-1">{errors.blockNo}</span>}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label htmlFor="landmark" className="block text-sm font-medium text-gray-700 mb-1">
                                                            Landmark <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="landmark"
                                                            id="landmark"
                                                            value={landmark}
                                                            onChange={(e) => setLandmark(e.target.value)}
                                                            className="pl-3 pr-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                                                            placeholder="Landmark"
                                                        />
                                                        {errors.landmark && <span className="text-xs text-red-600 mt-1">{errors.landmark}</span>}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                                                            Address (Street, Area) <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="address"
                                                            id="address"
                                                            value={address}
                                                            onChange={(e) => setAddress(e.target.value)}
                                                            className="pl-3 pr-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                                                            placeholder="Address (Street, Area)"
                                                        />
                                                        {errors.address && <span className="text-xs text-red-600 mt-1">{errors.address}</span>}
                                                    </div>
                                                    <div className="flex flex-col sm:col-span-2">
                                                        <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">
                                                            Pincode <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                name="pincode"
                                                                id="pincode"
                                                                value={pincode}
                                                                onChange={(e) => onPinCodeChange ? onPinCodeChange(e.target.value) : setPincode(e.target.value)}
                                                                className={`pl-3 pr-10 py-2 block w-full rounded-md border shadow-sm focus:border-green-500 focus:ring-green-500 ${
                                                                    pinCodeValidation?.isValid === true ? 'border-green-500' :
                                                                    pinCodeValidation?.isValid === false ? 'border-red-500' :
                                                                    'border-gray-300'
                                                                }`}
                                                                placeholder="Pincode"
                                                                maxLength="6"
                                                            />
                                                            {pinCodeValidation?.isChecking && (
                                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                                    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                                                </div>
                                                            )}
                                                            {pinCodeValidation?.isValid === true && (
                                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                                                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>
                                                                </div>
                                                            )}
                                                            {pinCodeValidation?.isValid === false && (
                                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                                                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/></svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {errors.pincode && <span className="text-xs text-red-600 mt-1">{errors.pincode}</span>}
                                                        {pinCodeValidation?.isValid === true && pinCodeValidation?.area && (
                                                            <span className="text-xs text-green-600 mt-1">✓ Delivery available in {pinCodeValidation.area}</span>
                                                        )}
                                                        {pinCodeValidation?.isValid === false && pincode && pincode.length === 6 && (
                                                            <div className="text-xs text-red-600 mt-1">
                                                                <div className="flex items-center gap-1 mb-1">
                                                                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>
                                                                    We don't deliver to this area yet
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onDeliveryRequest && onDeliveryRequest(pincode)}
                                                                    className="text-blue-600 hover:text-blue-800 underline text-xs"
                                                                >
                                                                    Request delivery to this area
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                                                            City <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="city"
                                                            id="city"
                                                            value={city}
                                                            onChange={(e) => setCity(e.target.value)}
                                                            className="pl-3 pr-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                                                            placeholder="City"
                                                        />
                                                        {errors.city && <span className="text-xs text-red-600 mt-1">{errors.city}</span>}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                                                            State <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="state"
                                                            id="state"
                                                            value="Telangana"
                                                            disabled
                                                            className="pl-3 pr-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm bg-gray-100 text-gray-700 cursor-not-allowed"
                                                            placeholder="State"
                                                        />
                                                        {errors.state && <span className="text-xs text-red-600 mt-1">{errors.state}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                        <div className="mt-8 flex justify-center gap-3">
                                        <button
                                            type="button"
                                                className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 transition shadow-lg ${
                                                    pinCodeValidation && pinCodeValidation.isValid === false
                                                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                                        : 'bg-green-600 text-white hover:bg-green-700'
                                                }`}
                                            onClick={handleOrderNow}
                                            disabled={pinCodeValidation && pinCodeValidation.isValid === false}
                                        >
                                            {pinCodeValidation && pinCodeValidation.isValid === false 
                                                ? 'Invalid Delivery Area' 
                                                : 'Place Order (Cash on Delivery)'
                                            }
                                        </button>
                                            <button
                                                type="button"
                                                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 transition shadow-lg"
                                                onClick={closeModal}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    )
}