// Manual fix script for runtime errors
// Run this script if the app is still stuck loading

console.log('🔧 Manual Runtime Error Fix Script');
console.log('==================================');

// Function to clear all stored data
function clearAllData() {
  try {
    console.log('🧹 Clearing localStorage...');
    localStorage.clear();
    
    console.log('🧹 Clearing sessionStorage...');
    sessionStorage.clear();
    
    console.log('✅ All stored data cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    return false;
  }
}

// Function to clear only auth tokens
function clearAuthTokensOnly() {
  try {
    console.log('🔑 Clearing auth tokens only...');
    
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('Removed:', key);
    });
    
    console.log(`✅ Cleared ${keysToRemove.length} auth tokens`);
    return true;
  } catch (error) {
    console.error('❌ Error clearing auth tokens:', error);
    return false;
  }
}

// Main fix function
function fixRuntimeError() {
  console.log('🚀 Starting runtime error fix...');
  
  // First try soft fix (clear auth tokens only)
  console.log('\n1️⃣ Attempting soft fix...');
  if (clearAuthTokensOnly()) {
    console.log('✅ Soft fix completed. Refreshing page in 2 seconds...');
    setTimeout(() => window.location.reload(), 2000);
    return;
  }
  
  // If soft fix fails, try hard fix (clear all data)
  console.log('\n2️⃣ Soft fix failed. Attempting hard fix...');
  if (clearAllData()) {
    console.log('✅ Hard fix completed. Refreshing page in 2 seconds...');
    setTimeout(() => window.location.reload(), 2000);
    return;
  }
  
  // If both fail, manual intervention required
  console.log('\n❌ Both fixes failed. Manual intervention required:');
  console.log('1. Open DevTools > Application > Storage');
  console.log('2. Clear all localStorage and sessionStorage');
  console.log('3. Refresh the page manually');
}

// Auto-run if window is available (browser environment)
if (typeof window !== 'undefined') {
  console.log('🌐 Browser environment detected. You can run:');
  console.log('• fixRuntimeError() - Full automatic fix');
  console.log('• clearAuthTokensOnly() - Clear auth tokens only');
  console.log('• clearAllData() - Clear all stored data');
  
  // Make functions available globally for manual execution
  window.fixRuntimeError = fixRuntimeError;
  window.clearAuthTokensOnly = clearAuthTokensOnly;
  window.clearAllData = clearAllData;
  
  // Check if app is stuck loading and auto-fix after 30 seconds
  setTimeout(() => {
    const loadingElements = document.querySelectorAll('[data-testid="loading"], .animate-spin');
    if (loadingElements.length > 0) {
      console.log('⚠️ App appears to be stuck loading. Auto-running fix...');
      fixRuntimeError();
    }
  }, 30000);
  
} else {
  console.log('📄 Node.js environment detected. Running fix...');
  fixRuntimeError();
}

console.log('\n📚 For more help, visit: /runtime-diagnostic');
console.log('🆘 Emergency route: /manual-setup');
