import { Fragment, useContext, useState, useRef, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FiX, FiMail, FiLock, FiUser, FiPhone, FiEye, FiEyeOff } from 'react-icons/fi';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier, sendPasswordResetEmail } from 'firebase/auth';
import { auth, fireDB } from '../../firebase/FirebaseConfig';
import { Timestamp, addDoc, collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import myContext from '../../context/data/myContext';
import { initializeUserRole } from '../../utils/roleUtils';

export default function AuthModal({ isOpen, closeModal, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'signup'
  const [authType, setAuthType] = useState('email'); // 'email' or 'phone'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const [rePassword, setRePassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const timerRef = useRef(null);
  const recaptchaRef = useRef(null);

  const context = useContext(myContext);
  const { loading, setLoading } = context;

  // Function to convert Firebase error codes to user-friendly messages
  const getFirebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'auth/user-not-found':
        return 'No account found with this email. Please sign up first.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      case 'auth/invalid-phone-number':
        return 'Please enter a valid phone number.';
      case 'auth/invalid-verification-code':
        return 'Invalid OTP. Please check the code and try again.';
      case 'auth/code-expired':
        return 'OTP has expired. Please request a new code.';
      case 'auth/missing-verification-code':
        return 'Please enter the OTP sent to your phone.';
      case 'auth/quota-exceeded':
        return 'SMS quota exceeded. Please try again later.';
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  // Validate name - only alphabets and spaces
  const validateName = (name) => {
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!name.trim()) {
      return 'Name is required';
    }
    if (!nameRegex.test(name)) {
      return 'Name should only contain alphabets and spaces';
    }
    if (name.trim().length < 2) {
      return 'Name should be at least 2 characters long';
    }
    return '';
  };

  // Handle name change with validation
  const handleNameChange = (value) => {
    setName(value);
    const error = validateName(value);
    setNameError(error);
  };

  // Clean up recaptcha when modal closes or authType changes
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, [isOpen, authType]);

  // --- Email/Password Auth ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPasswordError('');
    setNameError('');

    try {
      if (mode === 'signup') {
        // Validate all fields
        if (!name || !email || !password || !rePassword) {
          throw new Error('All fields are required');
        }
        
        // Validate name
        const nameValidationError = validateName(name);
        if (nameValidationError) {
          setNameError(nameValidationError);
          setLoading(false);
          return;
        }
        
        if (password !== rePassword) {
          setPasswordError('Passwords do not match');
          setLoading(false);
          return;
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = {
          name: name.trim(),
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          phone,
          time: Timestamp.now()
        };
        
        // Store user in Firestore with UID as doc ID
        const userRef = doc(fireDB, 'users', userCredential.user.uid);
        await setDoc(userRef, {
          ...user,
          createdAt: new Date().toISOString(),
          isActive: true
        });
        
        localStorage.setItem('user', JSON.stringify(userCredential));
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('userChanged'));
        toast.success('Account created successfully!');
      } else {
        // Login validation
        if (!email || !password) {
          throw new Error('Please enter both email and password');
        }
        
        const result = await signInWithEmailAndPassword(auth, email, password);
        
        // Update user info in Firestore
        const user = result.user;
        if (user) {
          const userRef = doc(fireDB, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          const userData = {
            email: user.email,
            lastLogin: new Date().toISOString(),
            displayName: user.displayName || '',
            phone: user.phoneNumber || '',
            isActive: true,
            updatedAt: new Date().toISOString()
          };
          
          if (userDoc.exists()) {
            await updateDoc(userRef, userData);
          } else {
            await setDoc(userRef, {
              ...userData,
              createdAt: new Date().toISOString()
            });
          }
        }
        
        localStorage.setItem('user', JSON.stringify(result));
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('userChanged'));
        toast.success('Welcome back!');
      }
      
      // Initialize user role
      await initializeUserRole();
      
      // Reset form
      setName(''); setEmail(''); setPassword(''); setPhone(''); setRePassword('');
      closeModal();
      
      // Small delay to ensure role is set before redirect
      setTimeout(() => {
      window.location.href = '/';
      }, 100);
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = error.code ? getFirebaseErrorMessage(error.code) : error.message;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // --- Phone/OTP Auth ---
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        callback: () => {
          // Callback is optional
        },
        'expired-callback': () => {
          // Reset the verification on expiry
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
          }
        }
      });
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNameError('');

    try {
      // Validate name
      const nameValidationError = validateName(name);
      if (nameValidationError) {
        setNameError(nameValidationError);
        setLoading(false);
        return;
      }

      // Validate phone
      if (!phone || phone.length !== 10) {
        throw new Error('Please enter exactly 10 digits for phone number');
      }

      // Remove any non-numeric characters and validate
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        throw new Error('Phone number must be exactly 10 digits');
      }
      
      // Check if starts with 6, 7, 8, or 9
      if (!/^[6789]/.test(cleanPhone)) {
        throw new Error('Phone number must start with 6, 7, 8, or 9');
      }

      // Setup reCAPTCHA
      setupRecaptcha();
      
      // Format phone number
      const fullPhone = '+91' + cleanPhone;
      
      try {
        // Get verification ID
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, appVerifier);
      setConfirmResult(confirmation);
      setOtpSent(true);
        toast.success('OTP sent to your phone!');
    } catch (error) {
        console.error('Phone auth error:', error);
      // Clear recaptcha on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
        throw error;
      }
    } catch (error) {
      console.error('OTP send error:', error);
      const errorMessage = error.code ? getFirebaseErrorMessage(error.code) : error.message;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!otp || otp.length !== 6) {
        throw new Error('Please enter the 6-digit OTP');
      }
      
      if (!confirmResult) {
        throw new Error('Please request OTP first');
      }

      const result = await confirmResult.confirm(otp);
      
      // Store user in Firestore if new
      const user = result.user;
      if (user) {
        const userRef = doc(fireDB, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const userData = {
          name: name.trim(),
          phone: user.phoneNumber,
          lastLogin: new Date().toISOString(),
          isActive: true,
          updatedAt: new Date().toISOString()
        };
        
        if (userDoc.exists()) {
          await updateDoc(userRef, userData);
        } else {
          await setDoc(userRef, {
            ...userData,
            createdAt: new Date().toISOString()
          });
        }
      }

      localStorage.setItem('user', JSON.stringify(result));
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('userChanged'));
      toast.success('Phone verified successfully!');
      
      // Initialize user role
      await initializeUserRole();
      
      // Reset form
      setOtp('');
      setPhone('');
      setName('');
      setOtpSent(false);
      setConfirmResult(null);
      
      // Clear recaptcha after successful login
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }

      closeModal();
      
      // Small delay to ensure role is set before redirect
      setTimeout(() => {
      window.location.href = '/';
      }, 100);
    } catch (error) {
      console.error('OTP verification error:', error);
      const errorMessage = error.code ? getFirebaseErrorMessage(error.code) : error.message;
      toast.error(errorMessage);
      
      // Clear recaptcha on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email to reset password.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      const errorMessage = error.code ? getFirebaseErrorMessage(error.code) : error.message;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP logic
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    // Re-trigger OTP send
    await handleSendOtp({ preventDefault: () => {} });
  };

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-6">
                  <Dialog.Title className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {mode === 'login' ? 'Welcome Back!' : 'Create Account'}
                  </Dialog.Title>
                  <button
                    onClick={closeModal}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    <FiX className="h-6 w-6" />
                  </button>
                </div>

                {/* Auth type switcher */}
                <div className="flex flex-col mb-6">
                  <div className="flex justify-center gap-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 transition-all duration-200">
                    <button
                      className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:z-10 
                        ${authType === 'email' ? 'bg-white dark:bg-gray-900 shadow text-green-700 dark:text-green-300 border border-green-500' : 'text-gray-600 dark:text-gray-300'}`}
                      style={{ minWidth: 100 }}
                      aria-selected={authType === 'email'}
                      role="tab"
                      tabIndex={authType === 'email' ? 0 : -1}
                      onClick={() => { setAuthType('email'); setOtpSent(false); setConfirmResult(null); setNameError(''); setShowPassword(false); setShowRePassword(false); }}
                    >
                      <FiMail className="h-5 w-5" />
                      Email
                    </button>
                    <button
                      className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:z-10 
                        ${authType === 'phone' ? 'bg-white dark:bg-gray-900 shadow text-green-700 dark:text-green-300 border border-green-500' : 'text-gray-600 dark:text-gray-300'}`}
                      style={{ minWidth: 100 }}
                      aria-selected={authType === 'phone'}
                      role="tab"
                      tabIndex={authType === 'phone' ? 0 : -1}
                      onClick={() => { setAuthType('phone'); setOtpSent(false); setConfirmResult(null); setNameError(''); setShowPassword(false); setShowRePassword(false); }}
                    >
                      <FiPhone className="h-5 w-5" />
                      Phone
                    </button>
                  </div>
                  <div className="h-px bg-gray-300 dark:bg-gray-600 mt-3 mb-1 w-full" />
                </div>

                {/* Email/Password Auth */}
                {authType === 'email' && (
                  <form onSubmit={handleAuth} className="space-y-4">
                    {mode === 'signup' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Name
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FiUser className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => handleNameChange(e.target.value)}
                              className={`block w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                                nameError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                              }`}
                              placeholder="Enter your name"
                            />
                          </div>
                          {nameError && <div className="text-red-500 text-xs mt-1">{nameError}</div>}
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiMail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiLock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Enter your password"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                          ) : (
                            <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Show re-enter password only in signup mode */}
                    {mode === 'signup' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Re-enter Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiLock className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type={showRePassword ? "text" : "password"}
                            value={rePassword}
                            onChange={(e) => setRePassword(e.target.value)}
                              className={`block w-full pl-10 pr-12 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                                passwordError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                              }`}
                            placeholder="Re-enter your password"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowRePassword(!showRePassword)}
                          >
                            {showRePassword ? (
                              <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                            ) : (
                              <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                            )}
                          </button>
                        </div>
                        {passwordError && <div className="text-red-500 text-xs mt-1">{passwordError}</div>}
                        </div>
                      </>
                    )}

                    {mode === 'signup' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiPhone className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="10-digit mobile number"
                            maxLength="10"
                          />
                        </div>
                      </div>
                    )}

                    {mode === 'login' && (
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        className="text-xs text-green-600 hover:underline focus:outline-none"
                        onClick={handleForgotPassword}
                        disabled={loading || resetEmailSent}
                      >
                        Forgot Password?
                      </button>
                      {resetEmailSent && <span className="text-xs text-green-500 ml-2">Reset email sent!</span>}
                    </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
                    </button>
                  </form>
                )}

                {/* Phone/OTP Auth */}
                {authType === 'phone' && (
                  <form className="space-y-4" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
                    {/* Name field for phone auth */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiUser className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          className={`block w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                            nameError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                          placeholder="Enter your name"
                          disabled={otpSent}
                        />
                      </div>
                      {nameError && <div className="text-red-500 text-xs mt-1">{nameError}</div>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiPhone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="10-digit mobile number"
                          maxLength="10"
                          disabled={otpSent}
                        />
                      </div>
                    </div>
                    
                    {otpSent && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Enter OTP
                        </label>
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Enter 6-digit OTP"
                          maxLength="6"
                        />
                      </div>
                    )}
                    
                    {otpSent && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-xs text-green-600 hover:underline focus:outline-none disabled:opacity-50"
                          onClick={handleResendOtp}
                          disabled={resendTimer > 0 || loading}
                        >
                          Resend OTP{resendTimer > 0 ? ` (${resendTimer}s)` : ''}
                        </button>
                      </div>
                    )}
                    
                    {/* Always render recaptcha container for reliability */}
                    <div id="recaptcha-container" ref={recaptchaRef} style={{ minHeight: 50 }} />
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Please wait...' : otpSent ? 'Verify OTP' : 'Get OTP'}
                    </button>
                  </form>
                )}

                <div className="mt-6 text-center">
                  <button
                    onClick={() => { 
                      setMode(mode === 'login' ? 'signup' : 'login'); 
                      setOtpSent(false); 
                      setConfirmResult(null); 
                      setNameError(''); 
                      setPasswordError('');
                      setShowPassword(false);
                      setShowRePassword(false);
                    }}
                    className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium transition-colors"
                  >
                    {mode === 'login'
                      ? "Don't have an account? Sign up"
                      : 'Already have an account? Sign in'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 