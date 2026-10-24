import { type Request, type Response } from "express";
import { db } from "@workspace/db";
import { preregistrationsTable, usersTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import { randomBytes, randomUUID } from "node:crypto";
import { createResponse } from "../utils/response.js";
import { preregisterSchema } from "../validators/preregister.js";

import { consentService } from "../services/consent-service.js";

export const LAUNCH_DATE_ISO = "2026-12-01T00:00:00+05:30";
// Planned benefits; registration does not grant a paid entitlement or reserve a handle.
export const FOUNDER_PERKS = [
  { id: "founder-badge", title: "Founder badge", description: "A planned profile badge to recognise our earliest members.", icon: "BadgeCheck" },
  { id: "priority-access", title: "Priority launch access", description: "Be among the first to hear when launch access opens.", icon: "Sparkles" },
  { id: "community-input", title: "Help shape Yor", description: "Share feedback and ideas as the community takes shape.", icon: "Users" },
  { id: "username-preference", title: "Your preferred username", description: "Tell us the username you would like. Availability is confirmed when you create your account.", icon: "AtSign" },
];

type SavedPreregistration = {
  id: string;
  username: string;
  referralCode: string | null;
  createdAt: string;
};
type NewPreregistration = {
  id: string;
  email: string;
  username: string;
  perks: string[];
  referralCode: string;
  referredBy: string | null;
  launchUpdatesConsentedAt: string;
};
export interface PreregistrationStore {
  hasEmail(email: string): Promise<boolean>;
  hasRegisteredUsername(username: string): Promise<boolean>;
  insert(input: NewPreregistration): Promise<SavedPreregistration | undefined>;
  count(): Promise<number>;
}

const preregistrationStore: PreregistrationStore = {
  async hasEmail(email) {
    const rows = await db.select({ id: preregistrationsTable.id }).from(preregistrationsTable)
      .where(sql`lower(${preregistrationsTable.email}) = ${email}`).limit(1);
    return rows.length > 0;
  },
  async hasRegisteredUsername(username) {
    const rows = await db.select({ id: usersTable.id }).from(usersTable)
      .where(sql`lower(${usersTable.username}) = ${username}`).limit(1);
    return rows.length > 0;
  },
  async insert(input) {
    // The unique indexes settle simultaneous submissions without overwriting
    // another person's registration, preference, or recorded consent.
    const rows = await db.insert(preregistrationsTable).values(input).onConflictDoNothing().returning({
      id: preregistrationsTable.id,
      username: preregistrationsTable.username,
      referralCode: preregistrationsTable.referralCode,
      createdAt: preregistrationsTable.createdAt,
    });
    return rows[0];
  },
  async count() {
    const result = await db.execute(sql`SELECT count(*)::int AS count FROM preregistrations`);
    return Number(result.rows[0]?.count ?? 0);
  },
};

export class PreregisterController {
  constructor(private readonly store: PreregistrationStore = preregistrationStore) {}

  private existingRegistration(res: Response) {
    // Knowing an email address does not authorise retrieval of its saved pass.
    return res.status(200).json(createResponse("If this email is already on our list, you are all set.", {
      isExisting: true,
      launchDate: LAUNCH_DATE_ISO,
      perks: FOUNDER_PERKS,
    }));
  }

  private usernameConflict(res: Response) {
    return res.status(409).json(createResponse(
      "Please choose another preferred username.", null, {}, ["username_unavailable"],
    ));
  }

  preregister = async (req: Request, res: Response) => {
    const parseResult = preregisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(createResponse("Invalid pre-registration details", null, {},
        parseResult.error.issues.map(error => error.message)));
    }
    const { email, username, referralCode, perks } = parseResult.data;

    try {
      if (await this.store.hasEmail(email)) return this.existingRegistration(res);
      if (await this.store.hasRegisteredUsername(username)) return this.usernameConflict(res);

      const saved = await this.store.insert({
        id: randomUUID(), email, username,
        perks: perks?.length ? perks : FOUNDER_PERKS.map(perk => perk.id),
        referralCode: `YOR-${randomBytes(12).toString("hex").toUpperCase()}`,
        referredBy: referralCode || null,
        launchUpdatesConsentedAt: new Date().toISOString(),
      });
      if (!saved) {
        // A competing request may have won after the initial email lookup.
        if (await this.store.hasEmail(email)) return this.existingRegistration(res);
        return this.usernameConflict(res);
      }

      await consentService.recordConsent({
        email,
        purpose: "launch_updates",
        version: "preregister_v1",
        granted: true,
        metadata: { source: "preregistration", preregistrationId: saved.id },
      }).catch(() => {});

      return res.status(201).json(createResponse("You're on the early member list!", {
        ...saved,
        // A stable, unique reference rather than a count that can change in a race.
        passNumber: `FOUNDER-${saved.id.toUpperCase()}`,
        launchDate: LAUNCH_DATE_ISO,
        perks: FOUNDER_PERKS,
        isExisting: false,
      }));
    } catch {
      // Driver errors can include email addresses and complete SQL parameters.
      console.warn("[Preregister] Registration storage is unavailable");
      return res.status(503).json(createResponse("Pre-registration is temporarily unavailable. Please try again shortly.",
        null, {}, ["preregistration_unavailable"]));
    }
  };

  getStats = async (_req: Request, res: Response) => {
    try {
      return res.status(200).json(createResponse("Pre-registration stats retrieved", {
        totalRegistered: await this.store.count(),
        launchDate: LAUNCH_DATE_ISO,
        perks: FOUNDER_PERKS,
      }));
    } catch {
      return res.status(503).json(createResponse("Pre-registration stats are temporarily unavailable",
        null, {}, ["preregistration_stats_unavailable"]));
    }
  };
}

export const preregisterController = new PreregisterController();
