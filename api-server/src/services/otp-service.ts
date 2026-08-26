import { UserRepository } from "../repositories/user-repository.js";
import { RedisRepository } from "../repositories/redis-repository.js";

/**
 * Phone OTP is deliberately unavailable until a verified SMS/WhatsApp
 * provider is configured. Keeping this service fail-closed prevents demo
 * codes, in-memory OTP state, and synthetic accounts from reaching a public
 * deployment.
 */
export class PhoneOtpNotConfiguredError extends Error {
  constructor() {
    super("Phone OTP is not enabled for this deployment");
    this.name = "PhoneOtpNotConfiguredError";
  }
}

export class OtpService {
  constructor(
    private readonly _userRepo: UserRepository,
    private readonly _redisRepo: RedisRepository,
  ) {}

  async sendOtp(_phoneNumber: string, _channel: "sms" | "whatsapp" = "whatsapp"): Promise<never> {
    throw new PhoneOtpNotConfiguredError();
  }

  async verifyOtp(_phoneNumber: string, _code: string): Promise<never> {
    throw new PhoneOtpNotConfiguredError();
  }
}
