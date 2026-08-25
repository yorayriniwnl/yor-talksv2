import { Router, Request, Response } from "express";
import { MediaService } from "../services/media-service.js";
import { upload } from "../middlewares/upload.js";
import { authenticate } from "../middlewares/auth.js";

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
        res.status(400).json({ success: false, message: "No file provided", errors: ["file_required"] });
        return;
      }

      const result = await mediaService.processUpload(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      res.status(201).json({
        success: true,
        message: "Media uploaded successfully",
        data: result,
        errors: [],
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || "Media processing failed",
        errors: ["media_processing_error"],
      });
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
        res.status(400).json({ success: false, message: "Filename and mimeType required", errors: ["invalid_input"] });
        return;
      }

      res.status(501).json({
        success: false,
        message: "Direct media uploads are not enabled for the college beta. Use the multipart upload endpoint.",
        errors: ["presign_not_configured"],
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message, errors: [] });
    }
  }
);

// Get HLS streaming manifest
router.get("/media/:id/hls", (req: Request, res: Response): void => {
  res.status(501).json({
    success: false,
    message: "Adaptive HLS streaming is not enabled for stored media in this beta",
    data: null,
    errors: ["hls_not_configured"],
  });
});

export default router;
