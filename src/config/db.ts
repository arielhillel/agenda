import mongoose from "mongoose";

export async function connectDB(connectionString: string): Promise<void> {
    try {
        await mongoose.connect(connectionString);
        console.log("Connected to MongoDB via Mongoose");
    } catch (err) {
        console.error("Mongoose connection error:", err);
        throw err;
    }
}