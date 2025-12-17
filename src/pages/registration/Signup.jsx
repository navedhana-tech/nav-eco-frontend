import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router'
import myContext from '../../context/data/myContext';
import { toast } from 'react-toastify';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, fireDB } from '../../firebase/FirebaseConfig';
import { Timestamp, addDoc, collection } from 'firebase/firestore';
import Loader from '../../components/loader/Loader';
import { Eye, EyeOff, ArrowLeft, User, Lock, Phone, Mail, MapPin, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { useUserTracking } from '../../hooks/useUserTracking';

function Signup() {
    const { trackPage } = useUserTracking();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const context = useContext(myContext);
    const { loading, setLoading } = context;

    // Track page visit
    useEffect(() => {
        trackPage('other');
    }, [trackPage]);

    const signup = async () => {
        setLoading(true)
        if (name === "" || email === "" || password === "") {
            return toast.error("Name, email and password are required")
        }

        try {
            const users = await createUserWithEmailAndPassword(auth, email, password);

            const user = {
                name: name,
                uid: users.user.uid,
                email: users.user.email,
                phone: phone || 'Not provided',
                address: address || 'Not provided',
                time: Timestamp.now(),
                date: new Date().toLocaleString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                }),
                // Initialize tracking data
                pageVisits: 0,
                totalOrders: 0,
                totalSpent: 0,
                isActive: true,
                createdAt: new Date().toLocaleString()
            }
            const userRef = collection(fireDB, "users")
            await addDoc(userRef, user);
            toast.success("Signup Successfully")
            setName("");
            setEmail("");
            setPassword("");
            setPhone("");
            setAddress("");
            setLoading(false)
            
        } catch (error) {
            console.log(error)
            setLoading(false)
        }
    }

    return (
        <div className='flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-green-50 px-2'>
            <div className='bg-white w-full max-w-xs sm:max-w-sm px-4 sm:px-8 py-8 rounded-2xl shadow-2xl border border-gray-100'>
                <div className="">
                    <h1 className='text-center text-gray-800 text-2xl mb-6 font-bold'>Create Account</h1>
                </div>
                <div>
                    <input type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        name='name'
                        className='bg-gray-50 mb-4 px-3 py-2 w-full rounded-xl text-gray-900 placeholder:text-gray-500 outline-none border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300'
                        placeholder='Full Name *'
                    />
                </div>
                <div>
                    <input type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        name='email'
                        className='bg-gray-50 mb-4 px-3 py-2 w-full rounded-xl text-gray-900 placeholder:text-gray-500 outline-none border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300'
                        placeholder='Email Address *'
                    />
                </div>
                <div>
                    <input type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        name='password'
                        className='bg-gray-50 mb-4 px-3 py-2 w-full rounded-xl text-gray-900 placeholder:text-gray-500 outline-none border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300'
                        placeholder='Password *'
                    />
                </div>
                <div>
                    <input type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        name='phone'
                        className='bg-gray-50 mb-4 px-3 py-2 w-full rounded-xl text-gray-900 placeholder:text-gray-500 outline-none border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300'
                        placeholder='Phone (Optional)'
                    />
                </div>
                <div>
                    <input type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        name='address'
                        className='bg-gray-50 mb-4 px-3 py-2 w-full rounded-xl text-gray-900 placeholder:text-gray-500 outline-none border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300'
                        placeholder='Address (Optional)'
                    />
                </div>
                <div className='flex justify-center mb-4'>
                    <button
                        onClick={signup}
                        className='bg-gradient-to-r from-blue-600 to-green-600 w-full text-white font-bold px-3 py-2 rounded-xl hover:from-blue-700 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg truncate'>
                        Create Account
                    </button>
                </div>
                <div className='text-center'>
                    <h2 className='text-gray-600 text-sm'>Already have an account? <Link className='text-blue-600 font-bold hover:text-blue-700 transition-colors' to={'/login'}>Login</Link></h2>
                </div>
            </div>
        </div>
    )
}

export default Signup