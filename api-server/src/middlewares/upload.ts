import multer from "multer";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export class InvalidFileTypeError extends Error {}

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new InvalidFileTypeError("Only image uploads are allowed"));
      return;
    }
    callback(null, true);
  },
});
