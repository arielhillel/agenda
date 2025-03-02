import { Request, Response } from "express";
import Schedule, { ISchedule } from "../models/Schedule";
import { getNextValidTimes, scheduleNextTask } from "../services/scheduler";
import Agenda from "agenda";

class ScheduleController {
    async deleteJob(req: Request, res: Response): Promise<void> {
        const { time, websiteId } = req.body as { time: string; websiteId: string };

        if (!time || !websiteId) {
            res.status(400).json({ error: "Time or WebsiteId is missing" });
            return;
        }

        const schedule: ISchedule = await Schedule.findOne({ websiteId }) as ISchedule;
        if (!schedule) {
            res.status(404).json({ error: "Schedule not found" });
            return;
        }

        const jobIndex: number = schedule.times.indexOf(time);
        if (jobIndex === -1) {
            res.status(404).json({ error: "Time not found in schedule" });
            return;
        }

        const agenda: Agenda = req.app.locals.agenda as Agenda;
        if (getNextValidTimes(schedule.times)[0] === time) {
            await agenda.cancel({ "data.time": time });
            schedule.times.splice(jobIndex, 1);
            await schedule.save();
            await scheduleNextTask(agenda, schedule.times, websiteId, schedule._id as string);
        } else {
            schedule.times.splice(jobIndex, 1);
            await schedule.save();
        }

        res.json({ message: "Time cancelled successfully", updatedSchedule: schedule.times });

    }
    
    async getAllJobs(req: Request, res: Response): Promise<void> {
        const { websiteId } = req.query as { websiteId?: string };

        if (!websiteId) {
            res.status(400).json({ error: "WebsiteId is required" });
            return;
        }

        const schedule: ISchedule = await Schedule.findOne({ websiteId }) as ISchedule;
        if (!schedule) {
            res.json([]);
            return;
        }
    
        res.json(schedule.times);
    }

    async schedulePosts(req: Request, res: Response): Promise<void> {
        const { times, websiteId } = req.body as { times: string[]; websiteId: string };

        if (!Array.isArray(times) || times.length === 0) {
            res.status(400).json({ error: "Times array is missing or empty" });
            return;
        }
        if (!websiteId) {
            res.status(400).json({ error: "WebsiteId is missing" });
            return;
        }

        let schedule = await Schedule.findOne({ websiteId });
        if (schedule) {
            schedule.times = [...new Set([...schedule.times, ...times])].sort();
        } else {
            schedule = new Schedule({ websiteId, times });
        }
        await schedule.save();

        const agenda = req.app.locals.agenda as Agenda;
        await agenda.cancel({ "data.websiteId": websiteId });
        await scheduleNextTask(agenda, schedule.times, websiteId, schedule._id as string);

        console.log(`Updated schedule saved for websiteId ${websiteId} with times: ${schedule.times.join(", ")}`);
        res.json({ message: "Schedule updated and next job scheduled successfully.", nextTimes: schedule.times });
    }
}

export default new ScheduleController();