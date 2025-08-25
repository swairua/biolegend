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
      (message.includes('ResizeObserver loop completed with undelivered notifications') ||
       message.includes('ResizeObserver loop limit exceeded'))
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
      (event.message.includes('ResizeObserver loop completed with undelivered notifications') ||
       event.message.includes('ResizeObserver loop limit exceeded'))
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  // Handle unhandled rejections that might contain ResizeObserver errors
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason &&
      typeof event.reason === 'string' &&
      (event.reason.includes('ResizeObserver loop completed with undelivered notifications') ||
       event.reason.includes('ResizeObserver loop limit exceeded'))
    ) {
      event.preventDefault();
    }
  });

  // Override the global error handler for ResizeObserver
  if (typeof window !== 'undefined') {
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (
        typeof message === 'string' &&
        (message.includes('ResizeObserver loop completed with undelivered notifications') ||
         message.includes('ResizeObserver loop limit exceeded'))
      ) {
        return true; // Prevent the error from being logged
      }

      if (originalOnError) {
        return originalOnError.call(window, message, source, lineno, colno, error);
      }
      return false;
    };
  }
};

export const disableResizeObserverErrorSuppression = () => {
  suppressResizeObserverLoopErrors = false;
  // Note: This doesn't restore the original console.error
  // In practice, you'd rarely need to disable this
};
