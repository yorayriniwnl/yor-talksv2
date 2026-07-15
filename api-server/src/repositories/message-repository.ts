import { BaseRepository } from "./base-repository.js";
import type { ConversationRecord, MessageRecord } from "../types/index.js";

export class MessageRepository extends BaseRepository<MessageRecord> {
  create(message: MessageRecord): MessageRecord {
    return this.set(message.id, message);
  }

  listConversation(conversationId: string): MessageRecord[] {
    return this.getAll().filter((entry) => entry.conversationId === conversationId);
  }
}

export class ConversationRepository extends BaseRepository<ConversationRecord> {
  create(conversation: ConversationRecord): ConversationRecord {
    return this.set(conversation.id, conversation);
  }

  findBetween(participantA: string, participantB: string): ConversationRecord | undefined {
    return this.getAll().find(
      (conversation) =>
        (conversation.participantA === participantA && conversation.participantB === participantB) ||
        (conversation.participantA === participantB && conversation.participantB === participantA),
    );
  }
}
