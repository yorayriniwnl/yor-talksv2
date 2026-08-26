import multer from "multer";

export class InvalidFileTypeError extends Error {
  constructor(message = "Only image, video, and audio files are allowed") {
    super(message);
    this.name = "InvalidFileTypeError";
  }
}

const multerFactory = multer as unknown as typeof multer;

// Use memory storage so file buffer is directly accessible in request object
const storage = multerFactory.memoryStorage();

export const upload = multerFactory({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype.startsWith("audio/")
    ) {
      cb(null, true);
    } else {
      cb(new InvalidFileTypeError());
    }
  },
});

export const imageUpload = upload;
