import { collection, getDocs, query, where } from 'firebase/firestore';
import { fireDB } from '../firebase/FirebaseConfig';

// Debug function to check admin data
export const debugAdminData = async () => {
  try {
    console.log('=== DEBUG: Admin Data ===');
    
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    console.log('Current user:', user);
    
    // Get current role from localStorage
    const userRole = localStorage.getItem('userRole');
    console.log('Current role:', userRole);
    
    // Check all admins in database
    const adminsQuery = query(collection(fireDB, 'admins'));
    const adminSnapshot = await getDocs(adminsQuery);
    
    console.log('All admins in database:');
    adminSnapshot.forEach((doc) => {
      console.log('Admin ID:', doc.id);
      console.log('Admin Data:', doc.data());
    });
    
    // Check specific admin if user is logged in
    if (user?.user?.email) {
      console.log('Checking specific admin:', user.user.email);
      const specificAdminQuery = query(
        collection(fireDB, 'admins'),
        where('email', '==', user.user.email)
      );
      const specificAdminSnapshot = await getDocs(specificAdminQuery);
      
      if (!specificAdminSnapshot.empty) {
        console.log('Found specific admin data:', specificAdminSnapshot.docs[0].data());
      } else {
        console.log('No admin data found for current user');
      }
    }
    
    console.log('=== END DEBUG ===');
  } catch (error) {
    console.error('Debug error:', error);
  }
};

// Function to manually set role (for debugging)
export const setDebugRole = (role) => {
  console.log('Setting debug role:', role);
  localStorage.setItem('userRole', role);
  window.location.reload();
};

// Function to clear all auth data
export const clearAuthData = () => {
  console.log('Clearing all auth data');
  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
  window.location.reload();
};

// Function to check current auth state
export const checkAuthState = () => {
  console.log('=== AUTH STATE CHECK ===');
  console.log('User:', JSON.parse(localStorage.getItem('user')));
  console.log('Role:', localStorage.getItem('userRole'));
  console.log('========================');
};

// Make functions available globally for debugging
window.debugAdminData = debugAdminData;
window.setDebugRole = setDebugRole;
window.clearAuthData = clearAuthData;
window.checkAuthState = checkAuthState; 