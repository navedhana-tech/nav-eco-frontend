import React, { useContext, useEffect, useRef } from 'react';
import { useLocation } from '@tanstack/react-router';
import myContext from '../context/data/myContext';

const UserActivityTracker = () => {
    const { trackUserActivity, trackingEnabled } = useContext(myContext);
    const location = useLocation();
    const lastTrackedRef = useRef({});

    useEffect(() => {
        const trackVisit = async () => {
            // Skip if tracking is disabled
            if (!trackingEnabled) {
                console.log('Tracking disabled, skipping visit tracking');
                return;
            }

            // Get user from localStorage
            const userData = localStorage.getItem('user');
            if (!userData) return;

                try {
                    const user = JSON.parse(userData);
                if (!user.user || !user.user.uid) return;

                const userId = user.user.uid;
                const currentTime = Date.now();
                const lastTracked = lastTrackedRef.current[userId] || 0;
                
                // Throttle tracking to once per 10 minutes per user
                const TRACKING_INTERVAL = 10 * 60 * 1000; // 10 minutes
                
                if (currentTime - lastTracked < TRACKING_INTERVAL) {
                    console.log('Skipping tracking - too soon since last track');
                    return;
                }

                // Track the visit
                await trackUserActivity(userId, 'page_visit');
                
                // Update last tracked time
                lastTrackedRef.current[userId] = currentTime;

                } catch (error) {
                    console.error('Error tracking user visit:', error);
                // Don't throw error to prevent app crashes
            }
        };

        // Track visit when component mounts or location changes
        trackVisit();
    }, [location.pathname, trackUserActivity, trackingEnabled]);

    // This component doesn't render anything
    return null;
};

export default UserActivityTracker; 