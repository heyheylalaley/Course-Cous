import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suppress Supabase refresh token errors in console (only "not found" errors)
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    // Filter out only "Refresh Token Not Found" errors
    const errorMessage = args[0]?.toString() || '';
    const errorObj = args[0];
    
    // Check if it's a refresh token "not found" error (not other auth errors)
    const isRefreshTokenNotFound = 
      (errorMessage.includes('Refresh Token Not Found') ||
       errorMessage.includes('refresh_token') && errorMessage.includes('Not Found')) ||
      (errorObj?.message && (
        errorObj.message.includes('Refresh Token Not Found') ||
        (errorObj.message.includes('refresh_token') && errorObj.message.includes('Not Found'))
      ));
    
    if (isRefreshTokenNotFound) {
      // Silently ignore refresh token "not found" errors (expected when no session exists)
      return;
    }
    // Log other errors normally
    originalError.apply(console, args);
  };
  
  // Also catch unhandled promise rejections related to refresh tokens
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    if (error?.message && (
      error.message.includes('Refresh Token Not Found') ||
      (error.message.includes('refresh_token') && error.message.includes('Not Found'))
    )) {
      event.preventDefault(); // Suppress the error
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Error rendering app:', error);
  // Безопасный рендеринг ошибки без использования innerHTML
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'padding: 20px; font-family: sans-serif;';
  
  const title = document.createElement('h1');
  title.textContent = 'Error loading application';
  errorDiv.appendChild(title);
  
  const errorMsg = document.createElement('p');
  // Безопасное отображение сообщения об ошибке
  errorMsg.textContent = error instanceof Error 
    ? `Error: ${error.message}` 
    : 'Unknown error occurred';
  errorDiv.appendChild(errorMsg);
  
  const consoleMsg = document.createElement('p');
  consoleMsg.textContent = 'Check the browser console for more details.';
  errorDiv.appendChild(consoleMsg);
  
  // Очистить root и добавить безопасный контент
  rootElement.innerHTML = '';
  rootElement.appendChild(errorDiv);
}