export const ENCRYPTION_PORT = Symbol("ENCRYPTION_PORT");

export interface EncryptionPort {
    encrypt(data: string): Promise<string>
    decrypt(data: string): Promise<string>
}
