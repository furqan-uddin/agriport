import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadBuffer, isConfigured as isCloudinaryConfigured } from '../config/cloudinary.js';
import AppError from '../utils/AppError.js';
import logger from '../config/logger.js';

// 1. Configure Multer Memory Storage (keep files in buffer)
const storage = multer.memoryStorage();

// 2. File Filter (Allow JPEG, PNG, PDF only)
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, and PDF files are allowed!', 400), false);
  }
};

// 3. Multer Instance
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

/**
 * Express middleware to process uploaded files, upload them to Cloudinary,
 * or fallback to local disk storage if Cloudinary is not configured.
 * 
 * @param {Array<Object>} fieldsConfig - Config array for multer fields (e.g. [{ name: 'aadhaar', maxCount: 1 }])
 * @returns {Function} Express middleware handler
 */
export const handleUploads = (fieldsConfig) => {
  const multerMiddleware = upload.fields(fieldsConfig);

  return (req, res, next) => {
    // Run multer parsing first
    multerMiddleware(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError('File size is too large. Max limit is 5MB.', 400));
          }
          return next(new AppError(`File upload error: ${err.message}`, 400));
        }
        return next(err);
      }

      // If no files were uploaded, continue
      if (!req.files || Object.keys(req.files).length === 0) {
        return next();
      }

      // Ensure local uploads directory exists (for fallback storage)
      const localUploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(localUploadDir)) {
        fs.mkdirSync(localUploadDir, { recursive: true });
      }

      try {
        req.uploadedFiles = {}; // Attach parsed file URLs to request object

        // Iterate over each field
        for (const fieldName of Object.keys(req.files)) {
          const files = req.files[fieldName];
          req.uploadedFiles[fieldName] = [];

          for (const file of files) {
            let fileUrl = null;

            // Attempt Cloudinary upload if SDK is configured
            if (isCloudinaryConfigured()) {
              try {
                fileUrl = await uploadBuffer(file.buffer, 'agriport_kyc');
                logger.info(`Uploaded file ${file.originalname} successfully to Cloudinary.`);
              } catch (uploadError) {
                logger.error(`Cloudinary upload failed for ${file.originalname}. Falling back to local storage.`, uploadError);
              }
            }

            // Fallback: Save file to local disk if Cloudinary is disabled or failed
            if (!fileUrl) {
              const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.fieldname}${path.extname(file.originalname)}`;
              const localFilePath = path.join(localUploadDir, uniqueFilename);
              
              // Write buffer to local disk
              fs.writeFileSync(localFilePath, file.buffer);
              
              // Generate absolute local URL (relative to root)
              fileUrl = `/uploads/${uniqueFilename}`;
              logger.info(`Saved file ${file.originalname} locally at: ${fileUrl}`);
            }

            req.uploadedFiles[fieldName].push(fileUrl);
          }
        }

        next();
      } catch (uploadError) {
        next(uploadError);
      }
    });
  };
};

export default handleUploads;
