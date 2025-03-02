import { Schema, model, Document } from "mongoose";

export interface ISchedule extends Document {
    _id: string;
    websiteId: number;
    times: string[];
}

const scheduleSchema = new Schema<ISchedule>({
    websiteId: { type: Number, required: true },
    times: { type: [String], required: true },
});

export default model<ISchedule>("Schedule", scheduleSchema);