// Example: Using @vercel/analytics in a JavaScript application
// This demonstrates the programmatic approach for frameworks

import { inject } from '@vercel/analytics';

// Initialize Vercel Web Analytics
// Note: inject() must run on the client side
inject();

// Optional: Track custom events
export function trackEvent(eventName, eventData = {}) {
  if (window.va) {
    window.va('event', { name: eventName, data: eventData });
  }
}

// Example usage:
// trackEvent('page_view', { page: window.location.pathname });
// trackEvent('button_click', { button_id: 'cta-primary' });
