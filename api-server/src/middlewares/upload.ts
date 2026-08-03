import multer from "multer";

export class InvalidFileTypeError extends Error {
  constructor(message = "Only image and video files are allowed") {
    super(message);
    this.name = "InvalidFileTypeError";
  }
}

// Use memory storage so file buffer is directly accessible in request object
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new InvalidFileTypeError());
    }
  },
});

export const imageUpload = upload;
