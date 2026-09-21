import { Injectable } from "@nestjs/common";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { EncryptionPort } from "../../application/encryption.port.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PAYLOAD_VERSION = "v1";

@Injectable()
export class Aes256GcmEncryptionService implements EncryptionPort {
  private readonly key: Buffer;

  constructor() {
    const secret = process.env.ENCRYPTION_SECRET_KEY;

    if (!secret) {
      throw new Error("ENCRYPTION_SECRET_KEY is required");
    }

    this.key = Buffer.from(secret, "base64");

    if (this.key.length !== 32) {
      throw new Error(
        "ENCRYPTION_SECRET_KEY must be a Base64-encoded 32-byte key",
      );
    }
  }

  async encrypt(data: string): Promise<string> {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(data, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      PAYLOAD_VERSION,
      iv.toString("base64url"),
      authTag.toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  }

  async decrypt(payload: string): Promise<string> {
    const [version, encodedIv, encodedAuthTag, encodedCiphertext, ...rest] =
      payload.split(".");

    if (
      version !== PAYLOAD_VERSION ||
      !encodedIv ||
      !encodedAuthTag ||
      rest.length > 0
    ) {
      throw new Error("Invalid encrypted payload format");
    }

    const iv = Buffer.from(encodedIv, "base64url");
    const authTag = Buffer.from(encodedAuthTag, "base64url");
    const ciphertext = Buffer.from(encodedCiphertext ?? "", "base64url");

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error("Invalid encrypted payload format");
    }

    try {
      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);

      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new Error("Unable to decrypt payload");
    }
  }
}
