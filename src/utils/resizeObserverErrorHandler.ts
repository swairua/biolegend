// Suppress ResizeObserver loop errors
// These are typically harmless and occur when observers trigger layout changes

let suppressResizeObserverLoopErrors = false;

export const enableResizeObserverErrorSuppression = () => {
  if (suppressResizeObserverLoopErrors) return;
  
  suppressResizeObserverLoopErrors = true;
  
  // Capture and suppress ResizeObserver loop errors
  const originalError = window.console.error;
  
  window.console.error = (...args) => {
    const message = args[0];
    
    // Check if it's a ResizeObserver loop error
    if (
      typeof message === 'string' &&
      message.includes('ResizeObserver loop completed with undelivered notifications')
    ) {
      // Suppress this specific error
      return;
    }
    
    // Allow all other errors through
    originalError.apply(console, args);
  };

  // Also handle it as a window error event
  window.addEventListener('error', (event) => {
    if (
      event.message &&
      event.message.includes('ResizeObserver loop completed with undelivered notifications')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
};

export const disableResizeObserverErrorSuppression = () => {
  suppressResizeObserverLoopErrors = false;
  // Note: This doesn't restore the original console.error
  // In practice, you'd rarely need to disable this
};
