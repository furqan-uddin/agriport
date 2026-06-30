import { v2 as cloudinary } from 'cloudinary';
import env from './env.js';
import logger from './logger.js';

let isCloudinaryConfigured = false;

// Check and configure Cloudinary if credentials are provided
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  isCloudinaryConfigured = true;
  logger.info('☁️ Cloudinary SDK configured successfully.');
} else {
  logger.warn('⚠️ Cloudinary environment variables missing. File uploads will fallback to local storage.');
}

/**
 * Uploads an in-memory file buffer directly to Cloudinary
 * 
 * @param {Buffer} fileBuffer - The file buffer from Multer
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<string>} The secure HTTPS URL of the uploaded asset
 */
export const uploadBuffer = (fileBuffer, folder = 'agriport') => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured) {
      // Return null to signal the middleware to fallback to local storage
      return resolve(null);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto', // Auto-detect image/raw/pdf types
      },
      (error, result) => {
        if (error) {
          logger.error('❌ Cloudinary upload stream error:', error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );

    // Write file buffer to stream and end
    uploadStream.end(fileBuffer);
  });
};

export const isConfigured = () => isCloudinaryConfigured;

export default {
  uploadBuffer,
  isConfigured,
};
