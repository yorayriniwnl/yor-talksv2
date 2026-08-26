import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { toPublicUser } from "../utils/user-view.js";
import { createResponse } from "../utils/response.js";
import { userIdParamSchema } from "../validators/params.js";
import { profileCommentIdParamSchema, profileCommentSchema, profileShowcaseIdParamSchema, profileShowcaseSchema } from "../validators/profile.js";
import { ProfileContentPolicyViolationError, ProfileInteractionForbiddenError, ProfileInteractionRequestError, ProfileInteractionService } from "../services/profile-interaction-service.js";

const router = Router();
const service = new ProfileInteractionService();
const paramId = (value: string | string[]) => Array.isArray(value) ? value[0] : value;

router.get("/users/:userId/profile-comments", authenticate, validateParams(userIdParamSchema), async (req, res) => {
  try {
    const profileId = paramId(req.params.userId);
    const comments = await service.listCommentsWithAuthors(profileId, req.user!.id);
    return res.status(200).json(createResponse("Profile comments loaded", comments.filter((item) => item.author).map(({ comment, author }) => ({
      id: comment.id,
      targetUserId: comment.profileId,
      author: toPublicUser(author!),
      content: comment.content,
      createdAt: comment.createdAt,
    }))));
  } catch (error) {
    if (error instanceof ProfileInteractionForbiddenError) return res.status(403).json(createResponse("Profile comments are unavailable", null, {}, [error.message]));
    if (error instanceof ProfileInteractionRequestError) return res.status(404).json(createResponse("Profile not found", null, {}, [error.message]));
    console.error(error);
    return res.status(500).json(createResponse("Profile comments could not be loaded", null, {}, ["Internal server error"]));
  }
});

router.post("/users/:userId/profile-comments", authenticate, validateParams(userIdParamSchema), validateBody(profileCommentSchema), async (req, res) => {
  try {
    const result = await service.createComment(paramId(req.params.userId), req.user!.id, req.body.content);
    return res.status(201).json(createResponse("Profile comment created", {
      id: result.comment.id,
      targetUserId: result.comment.profileId,
      author: toPublicUser(result.author),
      content: result.comment.content,
      createdAt: result.comment.createdAt,
    }));
  } catch (error) {
    if (error instanceof ProfileContentPolicyViolationError) return res.status(422).json(createResponse(error.message, null, {}, ["content_policy_violation"]));
    if (error instanceof ProfileInteractionForbiddenError) return res.status(403).json(createResponse("Profile comment could not be created", null, {}, [error.message]));
    if (error instanceof ProfileInteractionRequestError) return res.status(404).json(createResponse("Profile not found", null, {}, [error.message]));
    console.error(error);
    return res.status(500).json(createResponse("Profile comment could not be created", null, {}, ["Internal server error"]));
  }
});

router.delete("/users/:userId/profile-comments/:commentId", authenticate, validateParams(profileCommentIdParamSchema), async (req, res) => {
  try {
    const comment = await service.deleteComment(paramId(req.params.userId), paramId(req.params.commentId), req.user!.id);
    return res.status(200).json(createResponse("Profile comment deleted", comment));
  } catch (error) {
    if (error instanceof ProfileInteractionForbiddenError) return res.status(403).json(createResponse("Profile comment could not be deleted", null, {}, [error.message]));
    if (error instanceof ProfileInteractionRequestError) return res.status(404).json(createResponse("Profile comment not found", null, {}, [error.message]));
    console.error(error);
    return res.status(500).json(createResponse("Profile comment could not be deleted", null, {}, ["Internal server error"]));
  }
});

router.get("/users/:userId/showcases", authenticate, validateParams(userIdParamSchema), async (req, res) => {
  try {
    return res.status(200).json(createResponse("Profile showcases loaded", await service.listShowcases(paramId(req.params.userId), req.user!.id)));
  } catch (error) {
    if (error instanceof ProfileInteractionForbiddenError) return res.status(403).json(createResponse("Profile showcases are unavailable", null, {}, [error.message]));
    if (error instanceof ProfileInteractionRequestError) return res.status(404).json(createResponse("Profile not found", null, {}, [error.message]));
    console.error(error);
    return res.status(500).json(createResponse("Profile showcases could not be loaded", null, {}, ["Internal server error"]));
  }
});

router.post("/users/:userId/showcases", authenticate, validateParams(userIdParamSchema), validateBody(profileShowcaseSchema), async (req, res) => {
  try {
    const userId = paramId(req.params.userId);
    if (userId !== req.user!.id) return res.status(403).json(createResponse("Only the profile owner can add showcases", null, {}, ["owner_only"]));
    return res.status(201).json(createResponse("Profile showcase created", await service.createShowcase(userId, req.body)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(createResponse("Profile showcase could not be created", null, {}, ["Internal server error"]));
  }
});

router.delete("/users/:userId/showcases/:showcaseId", authenticate, validateParams(profileShowcaseIdParamSchema), async (req, res) => {
  try {
    const userId = paramId(req.params.userId);
    if (userId !== req.user!.id) return res.status(403).json(createResponse("Only the profile owner can remove showcases", null, {}, ["owner_only"]));
    return res.status(200).json(createResponse("Profile showcase deleted", await service.deleteShowcase(userId, paramId(req.params.showcaseId))));
  } catch (error) {
    if (error instanceof ProfileInteractionRequestError) return res.status(404).json(createResponse("Profile showcase not found", null, {}, [error.message]));
    console.error(error);
    return res.status(500).json(createResponse("Profile showcase could not be deleted", null, {}, ["Internal server error"]));
  }
});

export default router;
