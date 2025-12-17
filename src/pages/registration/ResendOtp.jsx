import React, { useContext, useEffect, useState, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { auth } from '../../firebase/FirebaseConfig';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { toast } from 'react-toastify';
import myContext from '../../context/data/myContext';
import { useUserTracking } from '../../hooks/useUserTracking';

export default function ResendOtp() {
  const { trackPage } = useUserTracking();
  const context = useContext(myContext);
  const { loading, setLoading } = context;
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef(null);
  const recaptchaRef = useRef(null);

  // Track page visit
  useEffect(() => {
    trackPage('other');
  }, [trackPage]);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier && document.getElementById('recaptcha-container')) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        'recaptcha-container',
        { size: 'invisible', callback: () => {} },
        auth
      );
    }
  };

  const handleSendOtp = async (e) => {
    e && e.preventDefault();
    if (timer > 0) return;
    setLoading(true);
    try {
      if (!phone || phone.length !== 10) throw new Error('Enter a valid 10-digit phone number');
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const fullPhone = '+91' + phone;
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, appVerifier);
      setConfirmResult(confirmation);
      setOtpSent(true);
      toast.success('OTP sent!');
      setTimer(30);
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      toast.error(error.message || 'Failed to send OTP');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!otp || !confirmResult) throw new Error('Enter the OTP');
      await confirmResult.confirm(otp);
      toast.success('Phone verified!');
      setOtp(''); setPhone(''); setOtpSent(false); setConfirmResult(null);
    } catch (error) {
      toast.error(error.message || 'OTP verification failed');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Resend OTP</h2>
        <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter 10-digit phone number"
              maxLength="10"
              disabled={otpSent}
              required
            />
          </div>
          {otpSent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter OTP"
                maxLength="6"
                required
              />
            </div>
          )}
          <div id="recaptcha-container" style={{ minHeight: 50 }} />
          <button
            type="submit"
            disabled={loading || (timer > 0 && !otpSent)}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : otpSent ? 'Verify OTP' : timer > 0 ? `Resend OTP (${timer}s)` : 'Send OTP'}
          </button>
        </form>
      </div>
    </div>
  );
} 