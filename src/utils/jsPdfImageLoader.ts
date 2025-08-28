/**
 * Utility to load and convert images to base64 for use with jsPDF
 */

export interface ImageLoadResult {
  success: boolean;
  dataUrl?: string;
  width?: number;
  height?: number;
  error?: string;
}

/**
 * Load an image from URL and convert to base64 data URL
 */
export const loadImageAsBase64 = (imageUrl: string): Promise<ImageLoadResult> => {
  return new Promise((resolve) => {
    const img = new Image();
    
    // Enable CORS for cross-origin images
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create canvas to convert image to base64
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve({
            success: false,
            error: 'Could not get canvas context'
          });
          return;
        }
        
        // Set canvas dimensions to image dimensions
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0);
        
        // Convert to base64
        const dataUrl = canvas.toDataURL('image/png');
        
        resolve({
          success: true,
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to convert image'
        });
      }
    };
    
    img.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to load image from URL'
      });
    };
    
    // Set timeout for loading
    const timeout = setTimeout(() => {
      resolve({
        success: false,
        error: 'Image loading timeout'
      });
    }, 10000); // 10 second timeout
    
    img.onload = () => {
      clearTimeout(timeout);
      img.onload(null as any);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      img.onerror(null as any);
    };
    
    // Start loading the image
    img.src = imageUrl;
  });
};

/**
 * Calculate optimal dimensions for logo in PDF
 */
export const calculateLogoDimensions = (
  originalWidth: number, 
  originalHeight: number, 
  maxWidth: number = 80, 
  maxHeight: number = 40
) => {
  const aspectRatio = originalWidth / originalHeight;
  
  let newWidth = maxWidth;
  let newHeight = maxWidth / aspectRatio;
  
  // If height exceeds max, scale down using height constraint
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = maxHeight * aspectRatio;
  }
  
  return {
    width: newWidth,
    height: newHeight
  };
};

/**
 * Default company logo URL - Biolegend Scientific Ltd
 */
export const DEFAULT_LOGO_URL = 'https://cdn.builder.io/api/v1/image/assets%2F893e58768e5f4de981cdc56ff5e87db2%2Ff23ecbbcd4704426a991220b141c5ffd?format=webp&width=800';
