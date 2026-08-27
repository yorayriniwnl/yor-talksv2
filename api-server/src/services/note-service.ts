import { randomUUID } from "node:crypto";
import { NoteRepository } from "../repositories/note-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import type { NoteAudience, NoteRecord } from "../types/index.js";
import { DEFAULT_CONTENT_RATING } from "../utils/content-safety.js";
import { DEFAULT_CONTENT_CATEGORY } from "../utils/content-category.js";
import { ContentSafetyService } from "./content-safety-service.js";
import { AIService } from "./ai-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";

const NOTE_LIFETIME_MS = 24 * 60 * 60 * 1000;

export class NoteService {
  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly contentSafetyService: ContentSafetyService = new ContentSafetyService(),
    private readonly aiService: AIService = new AIService(),
  ) {}

  async createNote(input: {
    authorId: string;
    content: string;
    audience: NoteAudience;
    contentCategory?: string;
    contentRating?: NoteRecord["contentRating"];
  }): Promise<NoteRecord | undefined> {
    const author = await this.userRepository.findById(input.authorId);
    if (!author) return undefined;

    const content = input.content.trim();
    await enforceTextContentPolicy(content, this.aiService, "note");
    const now = new Date();
    const note: NoteRecord = {
      id: randomUUID(),
      authorId: input.authorId,
      content,
      audience: input.audience,
      contentCategory: input.contentCategory ?? DEFAULT_CONTENT_CATEGORY,
      contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + NOTE_LIFETIME_MS).toISOString(),
    };
    return this.noteRepository.replaceForAuthor(note);
  }

  async listVisibleNotes(viewerId: string): Promise<NoteRecord[]> {
    const notes = await this.noteRepository.listActive();
    const visible = await Promise.all(notes.map(async (note) => {
      if (note.authorId === viewerId) return note;
      if (!(await this.contentSafetyService.isVisible(note, viewerId, note.authorId))) return undefined;
      if (note.audience === "followers" && !(await this.userRepository.isFollowing(viewerId, note.authorId))) return undefined;
      if (note.audience === "close_friends" && !(await this.userRepository.isCloseFriend(note.authorId, viewerId))) return undefined;
      return note;
    }));
    return visible.filter((note): note is NoteRecord => Boolean(note));
  }

  async deleteNote(id: string, authorId: string): Promise<boolean> {
    return this.noteRepository.deleteOwned(id, authorId);
  }
}
