export const SUPPORTED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/webp', 'image/bmp', 'image/svg+xml', 'image/tiff',
  'image/avif', 'image/heic', 'image/heif'
];

const MAX_DISPLAY_SIZE = 800; // px — resize before storing
const MAX_STORAGE_KB = 200;   // kb — compress before localStorage

/**
 * Compress any image to safe size using Canvas
 * @param {File} file - The image file to compress
 * @returns {Promise<string>} base64 compressed image
 */
export const compressImageFile = async (
  file: File
): Promise<string> => {
  if (!SUPPORTED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
    // Return document as data URL without compression if not an image
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const compressedDataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let width = img.width;
        let height = img.height;

        if (width > MAX_DISPLAY_SIZE || height > MAX_DISPLAY_SIZE) {
          const ratio = Math.min(MAX_DISPLAY_SIZE / width, MAX_DISPLAY_SIZE / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const fallbackReader = new FileReader();
          fallbackReader.onload = (e) => resolve(e.target?.result as string);
          fallbackReader.onerror = reject;
          fallbackReader.readAsDataURL(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        let quality = 0.8;
        
        let result = canvas.toDataURL(outputType, quality);
        while (result.length > MAX_STORAGE_KB * 1024 * 1.37 && quality > 0.3) {
          quality -= 0.1;
          result = canvas.toDataURL(outputType, quality);
        }

        canvas.width = 0;
        canvas.height = 0;

        resolve(result);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        const fallbackReader = new FileReader();
        fallbackReader.onload = (e) => resolve(e.target?.result as string);
        fallbackReader.onerror = reject;
        fallbackReader.readAsDataURL(file);
      };

      img.src = objectUrl;
    });

    return compressedDataUrl;
  } catch (error) {
    console.error("[compressImage] Error:", error);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};
