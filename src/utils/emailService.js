/**
 * Send order notification email to admins
 * @param {Object} orderData - The order data to send
 * @returns {Promise<Object>} Response from the email service
 */
export const sendOrderNotificationEmail = async (orderData) => {
  try {
    // Determine the API URL
    // Separate-backend setup:
    // - Always call the backend via VITE_EMAIL_SERVICE_URL
    // - In local development, default to http://localhost:3001 if not set
    const isProduction = import.meta.env.PROD;
    const EMAIL_SERVICE_URL =
      import.meta.env.VITE_EMAIL_SERVICE_URL || (!isProduction ? 'http://localhost:3001' : '');

    if (!EMAIL_SERVICE_URL) {
      throw new Error(
        'Missing VITE_EMAIL_SERVICE_URL. Set it to your backend base URL (e.g. https://api.example.com).'
      );
    }

    const apiUrl = `${EMAIL_SERVICE_URL}/api/send-order-email`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }

    return result;
  } catch (error) {
    // Log error but don't throw - we don't want to fail order placement if email fails
    console.error('Error sending order notification email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

