import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { fireDB } from '../firebase/FirebaseConfig';

// Setup master admin in database
export const setupMasterAdmin = async () => {
  const masterAdminEmail = 'omprakash16003@gmail.com';
  
  try {
    // Check if master admin already exists
    const adminRef = doc(fireDB, 'admins', 'master_admin');
    const adminDoc = await getDoc(adminRef);
    
    if (!adminDoc.exists()) {
      // Create master admin record
      await setDoc(adminRef, {
        uid: 'master_admin_uid', // This should be the actual Firebase Auth UID
        name: 'Master Admin',
        email: masterAdminEmail,
        role: 'master_admin',
        permissions: {
          canCreateSubAdmin: true,
          canDeleteSubAdmin: true,
          canCreateDeliveryBoy: true,
          canDeleteDeliveryBoy: true,
          canManageProducts: true,
          canManageOrders: true,
          canViewAnalytics: true,
          canManageUsers: true,
          canAccessAllFunctions: true
        },
        createdAt: Timestamp.now(),
        createdBy: 'system',
        isActive: true,
        lastLogin: null
      });
      
      console.log('Master admin created successfully');
      return true;
    } else {
      console.log('Master admin already exists');
      return false;
    }
  } catch (error) {
    console.error('Error setting up master admin:', error);
    return false;
  }
};

// Initialize the role-based system
export const initializeRoleSystem = async () => {
  console.log('Initializing role-based admin system...');
  
  try {
    // Setup master admin
    await setupMasterAdmin();
    
    console.log('Role system initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing role system:', error);
    return false;
  }
};

// Create initial admin structure
export const createInitialAdminStructure = async () => {
  const structure = {
    roles: {
      master_admin: {
        name: 'Master Admin',
        level: 4,
        permissions: [
          'create_sub_admin',
          'delete_sub_admin',
          'create_delivery_boy',
          'delete_delivery_boy',
          'manage_products',
          'manage_orders',
          'view_analytics',
          'manage_users',
          'access_all_functions'
        ]
      },
      sub_admin: {
        name: 'Sub Admin',
        level: 3,
        permissions: [
          'create_delivery_boy',
          'delete_delivery_boy',
          'manage_products',
          'manage_orders',
          'view_analytics'
        ]
      },
      delivery_boy: {
        name: 'Delivery Boy',
        level: 2,
        permissions: [
          'view_assigned_orders',
          'update_order_status',
          'view_delivery_route'
        ]
      },
      user: {
        name: 'User',
        level: 1,
        permissions: [
          'place_order',
          'view_own_orders',
          'manage_profile'
        ]
      }
    }
  };
  
  try {
    // Store role structure in database
    await setDoc(doc(fireDB, 'system', 'role_structure'), structure);
    console.log('Role structure created successfully');
    return true;
  } catch (error) {
    console.error('Error creating role structure:', error);
    return false;
  }
}; 