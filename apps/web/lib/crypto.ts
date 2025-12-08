import CryptoJS from 'crypto-js';

// Use the same key in both web and mobile
const SECRET_KEY: string = "mySecureChat2024Key!@#";

export const encryptMessage = (text: string): string => {
  try {
    const encrypted: string = CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    return text;
  }
};

export const decryptMessage = (encryptedText: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
    const decrypted: string = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedText;
  } catch (error) {
    console.error("Decryption error:", error);
    return encryptedText;
  }
};