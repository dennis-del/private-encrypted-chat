import { Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    encryptedPrivateKey: { type: String, required: true }, // Encrypted with user's password
    publicKey: { type: String }, // Public key for others to encrypt messages
  },
  { timestamps: true }
);

export const User = models.User || model("User", userSchema) as any;
