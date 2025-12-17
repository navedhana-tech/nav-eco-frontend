import { Link, useNavigate } from '@tanstack/react-router'
import myContext from '../../context/data/myContext';
import { useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { auth, fireDB } from '../../firebase/FirebaseConfig';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithPhoneNumber, RecaptchaVerifier, linkWithCredential, PhoneAuthProvider } from 'firebase/auth';
import Loader from '../../components/loader/Loader';
import { Eye, EyeOff, ArrowLeft, User, Lock, Phone, Mail, LogIn, CheckCircle, AlertCircle } from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useUserTracking } from '../../hooks/useUserTracking';

function Login() {
    const { trackPage } = useUserTracking();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    
    const context = useContext(myContext)
    const { loading,setLoading} = context
    const navigate = useNavigate();

    // Track page visit
    useEffect(() => {
        trackPage('other');
    }, [trackPage]);

    // Validate email format
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            return 'Email is required';
        }
        if (!emailRegex.test(email)) {
            return 'Please enter a valid email address';
        }
        return '';
    };

    // Validate password
    const validatePassword = (password) => {
        if (!password) {
            return 'Password is required';
        }
        if (password.length < 6) {
            return 'Password must be at least 6 characters';
        }
        return '';
    };

    // Handle email change with validation
    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        setEmailError(validateEmail(value));
    };

    // Handle password change with validation
    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        setPasswordError(validatePassword(value));
    };

    // Get Firebase error message
    const getFirebaseErrorMessage = (errorCode) => {
        switch (errorCode) {
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
                return 'Invalid email or password. Please check your credentials and try again.';
            case 'auth/user-not-found':
                return 'No account found with this email. Please sign up first.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/user-disabled':
                return 'This account has been disabled. Please contact support.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection and try again.';
            default:
                return 'Login failed. Please check your credentials and try again.';
        }
    };

    const signin = async (e) => {
      e?.preventDefault();
      
      // Clear previous errors
      setEmailError('');
      setPasswordError('');

      // Validate fields before attempting login
      const emailValidationError = validateEmail(email);
      const passwordValidationError = validatePassword(password);

      if (emailValidationError) {
          setEmailError(emailValidationError);
          toast.error(emailValidationError);
          return;
      }

      if (passwordValidationError) {
          setPasswordError(passwordValidationError);
          toast.error(passwordValidationError);
          return;
      }

      setLoading(true);
      try {
        const result = await signInWithEmailAndPassword(auth, email.trim(), password)
        toast.success('Signin Successfully', {
          position: "top-right",
          autoClose: 2000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
        window.location.href='/'
        setLoading(false);
      } catch (error) {
        const errorMessage = error.code ? getFirebaseErrorMessage(error.code) : 'Login failed. Please try again.';
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
        setLoading(false);
      }
    }

    // Check if form is valid
    const isFormValid = email.trim() && password.trim() && !emailError && !passwordError;
   
    return (
        <div className='flex justify-center items-center h-screen bg-gray-100 px-2'>
            {loading && <Loader />}
            <div className='bg-gray-800 w-full max-w-xs sm:max-w-sm px-4 sm:px-8 py-8 rounded-xl'>
                <div className="">
                    <h1 className='text-center text-white text-xl mb-4 font-bold'>Login</h1>
                </div>
                <form onSubmit={signin}>
                <div>
                        <input 
                            type="email"
                        name='email'
                        value={email}
                            onChange={handleEmailChange}
                            onBlur={() => setEmailError(validateEmail(email))}
                            className={`bg-gray-600 mb-1 px-3 py-2 w-full rounded-lg text-white placeholder:text-gray-200 outline-none focus:ring-2 ${
                                emailError ? 'focus:ring-red-500 border border-red-500' : 'focus:ring-yellow-500'
                            }`}
                        placeholder='Email'
                            required
                    />
                        {emailError && (
                            <p className='text-red-400 text-xs mb-2'>{emailError}</p>
                        )}
                </div>
                <div>
                    <input
                        type="password"
                        value={password}
                            onChange={handlePasswordChange}
                            onBlur={() => setPasswordError(validatePassword(password))}
                            className={`bg-gray-600 mb-1 px-3 py-2 w-full rounded-lg text-white placeholder:text-gray-200 outline-none focus:ring-2 ${
                                passwordError ? 'focus:ring-red-500 border border-red-500' : 'focus:ring-yellow-500'
                            }`}
                        placeholder='Password'
                            required
                    />
                        {passwordError && (
                            <p className='text-red-400 text-xs mb-2'>{passwordError}</p>
                        )}
                </div>
                    <div className='flex justify-center mb-3 mt-4'>
                    <button
                            type="submit"
                            disabled={!isFormValid || loading}
                            className={`w-full text-black font-bold px-3 py-2 rounded-lg truncate transition-all ${
                                isFormValid && !loading
                                    ? 'bg-yellow-500 hover:bg-yellow-600 cursor-pointer'
                                    : 'bg-gray-500 cursor-not-allowed opacity-50'
                            }`}>
                            {loading ? 'Logging in...' : 'Login'}
                    </button>
                </div>
                </form>
                <div>
                    <h2 className='text-white text-sm'>Don't have an account <Link className='text-yellow-500 font-bold' to={'/signup'}>Signup</Link></h2>
                </div>
                <div className="mt-3">
                    <h2 className='text-white text-sm'>Or <Link className='text-yellow-500 font-bold' to={'/phone-auth'}>Login with Phone</Link></h2>
                </div>
            </div>
        </div>
    )
}

export default Login