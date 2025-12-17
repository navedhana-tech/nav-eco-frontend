import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { fireDB } from '../firebase/FirebaseConfig';

// Get current user's role
export const getCurrentUserRole = async () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    console.log('No user found in localStorage');
    return null;
  }

  console.log('Checking role for user:', user.user?.email);

  // Check if master admin (hardcoded for now)
  if (user.user?.email === 'omprakash16003@gmail.com') {
    console.log('User is master admin');
    localStorage.setItem('userRole', 'master_admin');
    return 'master_admin';
  }

  try {
    // Check in admins collection
    console.log('Checking admins collection...');
    const adminsQuery = query(
      collection(fireDB, 'admins'),
      where('email', '==', user.user?.email)
    );
    const adminSnapshot = await getDocs(adminsQuery);
    
    if (!adminSnapshot.empty) {
      const adminData = adminSnapshot.docs[0].data();
      console.log('Found admin data:', adminData);
      localStorage.setItem('userRole', adminData.role);
      return adminData.role;
    }

    // Check in delivery_boys collection
    console.log('Checking delivery_boys collection...');
    const deliveryQuery = query(
      collection(fireDB, 'delivery_boys'),
      where('email', '==', user.user?.email)
    );
    const deliverySnapshot = await getDocs(deliveryQuery);
    
    if (!deliverySnapshot.empty) {
      console.log('Found delivery boy data');
      localStorage.setItem('userRole', 'delivery_boy');
      return 'delivery_boy';
    }

    // Default to regular user
    console.log('User is regular user');
    localStorage.setItem('userRole', 'user');
    return 'user';
  } catch (error) {
    console.error('Error fetching user role:', error);
    localStorage.setItem('userRole', 'user');
    return 'user';
  }
};

// Check if user has specific role
export const hasRole = (requiredRole) => {
  const userRole = localStorage.getItem('userRole');
  return userRole === requiredRole;
};

// Check if user has any of the specified roles
export const hasAnyRole = (roles) => {
  const userRole = localStorage.getItem('userRole');
  return roles.includes(userRole);
};

// Check if user is admin (master or sub)
export const isAdmin = () => {
  const userRole = localStorage.getItem('userRole');
  return userRole === 'master_admin' || userRole === 'sub_admin';
};

// Check if user is master admin
export const isMasterAdmin = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.user?.email === 'omprakash16003@gmail.com' || 
         localStorage.getItem('userRole') === 'master_admin';
};

// Check if user can create admins
export const canCreateAdmins = () => {
  return isMasterAdmin();
};

// Check if user can create delivery boys
export const canCreateDeliveryBoys = () => {
  return isAdmin();
};

// Check if user has delivery access (admin or delivery boy)
export const hasDeliveryAccess = () => {
  const userRole = localStorage.getItem('userRole');
  return userRole === 'master_admin' || userRole === 'sub_admin' || userRole === 'delivery_boy';
};

// Check if user can delete users
export const canDeleteUsers = (targetUserRole) => {
  const userRole = localStorage.getItem('userRole');
  
  // Master admin can delete anyone except other master admins
  if (userRole === 'master_admin') {
    return targetUserRole !== 'master_admin';
  }
  
  // Sub admin can only delete delivery boys
  if (userRole === 'sub_admin') {
    return targetUserRole === 'delivery_boy';
  }
  
  return false;
};

// Get user permissions
export const getUserPermissions = async () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return {};

  try {
    const adminsQuery = query(
      collection(fireDB, 'admins'),
      where('email', '==', user.user?.email)
    );
    const adminSnapshot = await getDocs(adminsQuery);
    
    if (!adminSnapshot.empty) {
      const adminData = adminSnapshot.docs[0].data();
      return adminData.permissions || {};
    }

    return {};
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return {};
  }
};

// Initialize user role on login
export const initializeUserRole = async () => {
  console.log('Initializing user role...');
  const role = await getCurrentUserRole();
  console.log('User role determined:', role);
  
  if (role) {
    localStorage.setItem('userRole', role);
  }
  
  return role;
};

// Clear user role on logout
export const clearUserRole = () => {
  localStorage.removeItem('userRole');
};

// Role hierarchy for comparison
export const roleHierarchy = {
  'master_admin': 4,
  'sub_admin': 3,
  'delivery_boy': 2,
  'user': 1
};

// Check if user has higher or equal role
export const hasHigherOrEqualRole = (requiredRole) => {
  const userRole = localStorage.getItem('userRole');
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}; 