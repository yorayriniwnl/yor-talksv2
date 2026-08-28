import assert from "node:assert/strict";
import { after, test } from "node:test";
import { pool } from "@workspace/db";
import { EventRepository } from "../repositories/event-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { EventService } from "../services/event-service.js";
import { createTestUser } from "./test-helpers.js";

after(() => pool.end());

test("event RSVP status is exclusive and can be cleared", async () => {
  const userRepository = new UserRepository();
  const host = await createTestUser(userRepository);
  const attendee = await createTestUser(userRepository);
  const service = new EventService(new EventRepository());
  const event = await service.createEvent({
    hostId: host.id,
    title: "Open systems meetup",
    description: "A practical gathering for systems builders.",
    coverUrl: "https://example.test/event.jpg",
    category: "technology",
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    location: "Online",
    isOnline: true,
  });

  const going = await service.setRsvp(event.id, attendee.id, "going");
  assert.deepEqual(going?.attendeeIds, [attendee.id]);
  assert.deepEqual(going?.interestedIds, []);

  const interested = await service.setRsvp(event.id, attendee.id, "interested");
  assert.deepEqual(interested?.attendeeIds, []);
  assert.deepEqual(interested?.interestedIds, [attendee.id]);

  const cleared = await service.setRsvp(event.id, attendee.id, null);
  assert.deepEqual(cleared?.attendeeIds, []);
  assert.deepEqual(cleared?.interestedIds, []);
});
