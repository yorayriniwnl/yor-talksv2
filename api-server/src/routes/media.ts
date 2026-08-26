import { Router, Request, Response } from "express";
import { MediaService } from "../services/media-service.js";
import { upload } from "../middlewares/upload.js";
import { authenticate } from "../middlewares/auth.js";
import { createResponse } from "../utils/response.js";

const router = Router();
const mediaService = new MediaService();

// Direct multipart upload endpoint
router.post(
  "/media/upload",
  authenticate,
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json(createResponse("No file provided", null, {}, ["file_required"]));
        return;
      }

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

// Presigned upload URL generator for direct S3 / R2 uploads
router.post(
  "/media/presign",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { filename, mimeType } = req.body;
      if (!filename || !mimeType) {
        res.status(400).json(createResponse("Filename and mimeType required", null, {}, ["invalid_input"]));
        return;
      }

      res.status(501).json(createResponse("Direct uploads are not enabled in this deployment. Use multipart upload.", null, {}, ["presign_not_configured"]));
    } catch (err: any) {
      res.status(500).json(createResponse("Could not prepare media upload", null, {}, ["media_upload_error"]));
    }
  }
);

// Get HLS streaming manifest
router.get("/media/:id/hls", (req: Request, res: Response): void => {
  res.status(501).json(createResponse("Adaptive HLS streaming is not enabled in this deployment", null, {}, ["hls_not_configured"]));
});

export default router;
