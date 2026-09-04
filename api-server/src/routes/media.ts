import { Router, Request, Response } from "express";
import { MediaService } from "../services/media-service.js";
import { MediaProviderNotConfiguredError, StorageService } from "../services/storage-service.js";
import { assertValidUploadedFile, upload } from "../middlewares/upload.js";
import { authenticate } from "../middlewares/auth.js";
import { createResponse } from "../utils/response.js";
import { mediaRateLimiter } from "../middlewares/rate-limit.js";

const router = Router();
const mediaService = new MediaService();
const storageService = new StorageService();

// Direct multipart upload endpoint
router.post(
  "/media/upload",
  authenticate,
  mediaRateLimiter,
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json(createResponse("No file provided", null, {}, ["file_required"]));
        return;
      }

      if (process.env.NODE_ENV === "production") {
        res.status(503).json(createResponse("Media moderation is not configured", null, {}, ["media_moderation_unavailable"]));
        return;
      }

      assertValidUploadedFile(req.file);

      const result = await mediaService.processUpload(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      res.status(201).json(createResponse("Media uploaded successfully", result));
    } catch (err: any) {
      const status = err?.name === "MediaProviderNotConfiguredError" ? 503 : 500;
      res.status(status).json(createResponse(status === 503 ? "Media uploads are temporarily unavailable" : "Media processing failed", null, {}, [status === 503 ? "media_provider_not_configured" : "media_processing_error"]));
    }
  }
);

// Signed Cloudinary upload parameters keep large media off serverless request bodies.
router.post(
  "/media/presign",
  authenticate,
  mediaRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const filename = typeof req.body?.filename === "string" ? req.body.filename.trim() : "";
      const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType.toLowerCase() : "";
      if (!filename || filename.length > 255 || !mimeType) {
        res.status(400).json(createResponse("Filename and mimeType required", null, {}, ["invalid_input"]));
        return;
      }

      const purpose = req.body?.purpose === "avatar" || req.body?.purpose === "post" || req.body?.purpose === "media"
        ? req.body.purpose
        : "media";
      const isImage = mimeType.startsWith("image/");
      const isVideo = mimeType.startsWith("video/");
      const isAudio = mimeType.startsWith("audio/");
      if (!isImage && !isVideo && !isAudio) {
        res.status(415).json(createResponse("Unsupported media type", null, {}, ["unsupported_media_type"]));
        return;
      }
      if (purpose === "avatar" && !isImage) {
        res.status(415).json(createResponse("Avatars must be image files", null, {}, ["avatar_image_required"]));
        return;
      }

      if (process.env.NODE_ENV === "production") {
        res.status(503).json(createResponse("Media moderation is not configured", null, {}, ["media_moderation_unavailable"]));
        return;
      }

      const signature = storageService.createDirectUploadSignature(
        isImage ? "image" : "video",
        purpose === "avatar" ? "avatars" : isAudio ? "audio" : "posts",
        req.user!.id,
      );
      res.status(200).json(createResponse("Direct upload prepared", signature));
    } catch (err: any) {
      if (err instanceof MediaProviderNotConfiguredError) {
        res.status(503).json(createResponse("Media uploads are temporarily unavailable", null, {}, ["media_provider_not_configured"]));
        return;
      }
      res.status(500).json(createResponse("Could not prepare media upload", null, {}, ["media_upload_error"]));
    }
  }
);

// Get HLS streaming manifest
router.get("/media/:id/hls", (req: Request, res: Response): void => {
  res.status(501).json(createResponse("Adaptive HLS streaming is not enabled in this deployment", null, {}, ["hls_not_configured"]));
});

export default router;
