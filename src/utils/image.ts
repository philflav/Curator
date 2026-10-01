/**
 * Image processing utilities for client-side compression and thumbnail generation.
 */

export interface ProcessedImage {
  fullBlob: Blob;
  fullDataUrl: string;
  thumbnailBlob: Blob;
  thumbnailDataUrl: string;
  width: number;
  height: number;
}

export async function processImageFile(
  file: File,
  maxFullDim: number = 1600,
  maxThumbDim: number = 320,
  quality: number = 0.85
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        try {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          // 1. Full-size scaled image
          let targetWidth = originalWidth;
          let targetHeight = originalHeight;
          if (targetWidth > maxFullDim || targetHeight > maxFullDim) {
            if (targetWidth > targetHeight) {
              targetHeight = Math.round((targetHeight * maxFullDim) / targetWidth);
              targetWidth = maxFullDim;
            } else {
              targetWidth = Math.round((targetWidth * maxFullDim) / targetHeight);
              targetHeight = maxFullDim;
            }
          }

          const fullCanvas = document.createElement('canvas');
          fullCanvas.width = targetWidth;
          fullCanvas.height = targetHeight;
          const fullCtx = fullCanvas.getContext('2d');
          if (!fullCtx) throw new Error('Could not get 2D canvas context');
          fullCtx.drawImage(img, 0, 0, targetWidth, targetHeight);

          const fullDataUrl = fullCanvas.toDataURL('image/jpeg', quality);

          // 2. Thumbnail
          let thumbWidth = originalWidth;
          let thumbHeight = originalHeight;
          if (thumbWidth > maxThumbDim || thumbHeight > maxThumbDim) {
            if (thumbWidth > thumbHeight) {
              thumbHeight = Math.round((thumbHeight * maxThumbDim) / thumbWidth);
              thumbWidth = maxThumbDim;
            } else {
              thumbWidth = Math.round((thumbWidth * maxThumbDim) / thumbHeight);
              thumbHeight = maxThumbDim;
            }
          }

          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = thumbWidth;
          thumbCanvas.height = thumbHeight;
          const thumbCtx = thumbCanvas.getContext('2d');
          if (!thumbCtx) throw new Error('Could not get 2D canvas context for thumbnail');
          thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);

          const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);

          // Convert Data URLs to Blobs
          fullCanvas.toBlob(
            (fullBlob) => {
              if (!fullBlob) {
                reject(new Error('Failed to generate full blob'));
                return;
              }
              thumbCanvas.toBlob(
                (thumbBlob) => {
                  if (!thumbBlob) {
                    reject(new Error('Failed to generate thumbnail blob'));
                    return;
                  }
                  resolve({
                    fullBlob,
                    fullDataUrl,
                    thumbnailBlob: thumbBlob,
                    thumbnailDataUrl,
                    width: targetWidth,
                    height: targetHeight,
                  });
                },
                'image/jpeg',
                0.8
              );
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
