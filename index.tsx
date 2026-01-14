import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

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