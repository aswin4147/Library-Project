import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Performance monitoring (optional)
const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

// Enhanced error handler for unhandled errors
const handleUnhandledError = (event) => {
  console.error('Unhandled error:', event.error);
  
  // Show user-friendly error message
  const errorToast = document.createElement('div');
  errorToast.className = 'global-error-toast';
  errorToast.innerHTML = `
    <div class="error-toast-content">
      <span class="error-toast-icon">⚠️</span>
      <div class="error-toast-text">
        <strong>Application Error</strong>
        <p>Something went wrong. Please refresh the page.</p>
      </div>
      <button class="error-toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  document.body.appendChild(errorToast);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (document.body.contains(errorToast)) {
      document.body.removeChild(errorToast);
    }
  }, 10000);
};

// Enhanced promise rejection handler
const handleUnhandledPromiseRejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Prevent the default browser behavior
  event.preventDefault();
  
  // Show user-friendly error message for critical promise rejections
  if (event.reason && event.reason.message && 
      (event.reason.message.includes('fetch') || 
       event.reason.message.includes('network') ||
       event.reason.message.includes('server'))) {
    
    const networkErrorToast = document.createElement('div');
    networkErrorToast.className = 'global-error-toast network-error';
    networkErrorToast.innerHTML = `
      <div class="error-toast-content">
        <span class="error-toast-icon">🌐</span>
        <div class="error-toast-text">
          <strong>Connection Error</strong>
          <p>Unable to connect to the server. Please check your connection.</p>
        </div>
        <button class="error-toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    document.body.appendChild(networkErrorToast);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (document.body.contains(networkErrorToast)) {
        document.body.removeChild(networkErrorToast);
      }
    }, 8000);
  }
};

// Setup global error handlers
window.addEventListener('error', handleUnhandledError);
window.addEventListener('unhandledrejection', handleUnhandledPromiseRejection);

// Application initialization
const initializeApp = () => {
  try {
    // Get the root element
    const rootElement = document.getElementById('root');
    
    if (!rootElement) {
      throw new Error('Root element not found. Please ensure there is a div with id="root" in your HTML.');
    }

    // Create React root
    const root = ReactDOM.createRoot(rootElement);
    
    // Add loading class to body for initial load
    document.body.classList.add('app-loading');
    
    // Render the app
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // Remove loading class after initial render
    setTimeout(() => {
      document.body.classList.remove('app-loading');
      document.body.classList.add('app-loaded');
    }, 100);
    
    // Log successful initialization
    console.log('🚀 Library Management System initialized successfully');
    
    // Performance monitoring in development
    if (process.env.NODE_ENV === 'development') {
      reportWebVitals((metric) => {
        console.log('📊 Performance metric:', metric);
      });
    }
    
  } catch (error) {
    console.error('Failed to initialize application:', error);
    
    // Show fallback error UI
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div class="app-init-error">
          <div class="init-error-container">
            <div class="init-error-icon">⚠️</div>
            <h2>Application Failed to Load</h2>
            <p>We're sorry, but the application could not be initialized.</p>
            <p class="error-details">Error: ${error.message}</p>
            <button onclick="window.location.reload()" class="reload-button">
              Reload Application
            </button>
          </div>
        </div>
      `;
    }
  }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Service Worker registration (optional - for future PWA features)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  // Clean up any timers, connections, etc.
  console.log('📝 Application cleanup completed');
});

// Export for potential future use
export { reportWebVitals };
