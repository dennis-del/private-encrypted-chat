import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { webcrypto } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const SALT_ROUNDS = 10;

export const signToken = (payload: any) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' }); // 15 min expiry as per req
};

export const verifyToken = (token: string) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

export const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string) => {
    return await bcrypt.compare(password, hash);
};

// Crypto Helpers for E2EE
// We use PBKDF2 to derive a key from the password to encrypt the user's private key.

async function getKeyFromPassword(password: string, salt: Uint8Array) {
    const enc = new TextEncoder();
    const keyMaterial = await webcrypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    return await webcrypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

export const encryptPrivateKey = async (privateKey: string, password: string) => {
    const salt = webcrypto.getRandomValues(new Uint8Array(16));
    const key = await getKeyFromPassword(password, salt);
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();

    const encrypted = await webcrypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        enc.encode(privateKey)
    );

    // Return format: salt:iv:ciphertext (hex encoded)
    const saltHex = Buffer.from(salt).toString('hex');
    const ivHex = Buffer.from(iv).toString('hex');
    const cipherHex = Buffer.from(encrypted).toString('hex');

    return `${saltHex}:${ivHex}:${cipherHex}`;
};

// Note: Decryption happens on the CLIENT side usually to ensure the server never sees the raw key.
// But for initial registration, we might generate keys on server or client.
// If we generate on server, we encrypt immediately and discard raw key.
// Ideally, keys are generated on client. But for this assignment, to simplify "User Accounts (Web)",
// we will generate keys on the server during registration, encrypt them immediately, and store.
// The server will NEVER store the raw private key.

export const generateKeyPair = async () => {
    const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );

    const pubExport = await webcrypto.subtle.exportKey("spki", publicKey);
    const privExport = await webcrypto.subtle.exportKey("pkcs8", privateKey);

    return {
        publicKey: Buffer.from(pubExport).toString('base64'),
        privateKey: Buffer.from(privExport).toString('base64')
    };
};
