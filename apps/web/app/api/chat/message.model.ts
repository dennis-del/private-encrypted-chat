import { Schema, model, models } from "mongoose";

const messageSchema = new Schema(
  {
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    content: { type: String, required: true }, // encrypted later
  },
  { timestamps: true }
);

export const Message = models.Message || model("Message", messageSchema) as any;
