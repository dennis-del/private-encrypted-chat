import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User } from "../auth/user.model";

export async function GET(req: Request) {
    try {
        await dbConnect();
        const token = req.headers.get("Authorization")?.split(" ")[1];

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded || typeof decoded === "string") {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Return all users except current one
        const users = await User.find({ _id: { $ne: decoded.userId } }).select("name email _id");

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Users error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
