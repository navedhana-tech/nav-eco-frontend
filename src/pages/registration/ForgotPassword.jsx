import { useState, useEffect } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/FirebaseConfig';
import { toast } from 'react-toastify';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useUserTracking } from '../../hooks/useUserTracking';

export default function ForgotPassword() {
  const { trackPage } = useUserTracking();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Track page visit
  useEffect(() => {
    trackPage('other');
  }, [trackPage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Configure actionCodeSettings for password reset
      const actionCodeSettings = {
        url: window.location.origin + '/login', // Redirect back to login page after password reset
        handleCodeInApp: true
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      setSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      toast.error(error.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
        {/* Back to Home Link */}
        <Link to="/" className="inline-flex items-center text-sm text-green-600 hover:text-green-500">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Home
        </Link>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
          <div className="mt-4 text-gray-600 dark:text-gray-400 space-y-2">
            <p>Forgot your password? No worries!</p>
            <p>Enter your email address below and we'll send you instructions to reset your password.</p>
          </div>
        </div>

        {/* Information Box */}
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Important Information</h3>
          <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
            <li>The reset link will expire in 1 hour</li>
            <li>Check your spam folder if you don't see the email</li>
            <li>Make sure to use your registered email address</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                       shadow-sm"
              placeholder="Enter your registered email"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || sent}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg 
                     shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : sent ? 'Email Sent!' : 'Send Reset Link'}
          </button>
        </form>

        {sent && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
              Reset Link Sent Successfully!
            </h3>
            <p className="mt-2 text-sm text-green-700 dark:text-green-300">
              Please check your email for instructions to reset your password. The link will expire in 1 hour.
            </p>
          </div>
        )}

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-green-600 hover:text-green-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 