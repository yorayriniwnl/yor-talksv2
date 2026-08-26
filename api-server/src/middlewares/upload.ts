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

export function detectMimeType(buffer: Buffer): string | undefined {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a")) return "image/gif";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand === "qt  ") return "video/quicktime";
    if (brand === "3gp4" || brand === "3gp5" || brand === "3gp6") return "video/3gpp";
    return "video/mp4";
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return "application/webm";
  if (buffer.length >= 3 && buffer.subarray(0, 3).toString("ascii") === "ID3") return "audio/mpeg";
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return "audio/mpeg";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WAVE") return "audio/wav";
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS") return "application/ogg";
  return undefined;
}

export function mimeMatches(declaredMimeType: string, detectedMimeType: string): boolean {
  if (detectedMimeType === "application/webm") return /^(audio|video)\/webm$/.test(declaredMimeType);
  if (detectedMimeType === "application/ogg") return /^(audio|video)\/ogg$/.test(declaredMimeType);
  return declaredMimeType === detectedMimeType;
}

export function assertValidUploadedFile(
  file: Express.Multer.File,
  expectedFamily?: "image" | "video" | "audio",
): string {
  const detectedMimeType = detectMimeType(file.buffer);
  if (!detectedMimeType || !mimeMatches(file.mimetype, detectedMimeType)) {
    throw new InvalidFileTypeError("The uploaded file does not match its declared media type");
  }
  if (expectedFamily) {
    const detectedFamily = detectedMimeType === "application/webm" || detectedMimeType === "application/ogg"
      ? file.mimetype.split("/", 1)[0]
      : detectedMimeType.split("/", 1)[0];
    if (detectedFamily !== expectedFamily) {
      throw new InvalidFileTypeError(`Only ${expectedFamily} files are allowed for this upload`);
    }
  }
  return detectedMimeType;
}

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

export const imageUpload = multerFactory({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new InvalidFileTypeError("Only image files are allowed"));
  },
});
