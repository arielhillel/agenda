import Agenda from "agenda";
import Schedule from "../models/Schedule";

export function getNextValidTimes(times: string[]): string[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return times
        .map((time) => {
            const [hour, minute] = time.split(":");
            let date = new Date(today);
            date.setHours(parseInt(hour), parseInt(minute), 0, 0);

            if (date <= now) {
                date = new Date(tomorrow);
                date.setHours(parseInt(hour), parseInt(minute), 0, 0);
            }

            return { time, date };
        })
        .filter((t) => t.date > now)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((t) => t.time);
}

export async function scheduleNextTask(
    agenda: Agenda,
    times: string[],
    websiteId: string,
    scheduleId: string
): Promise<void> {
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) throw new Error("Schedule not found");

    const nextValidTimes = getNextValidTimes(times);
    if (nextValidTimes.length === 0) return;

    const nextTime = nextValidTimes[0];
    const [hour, minute] = nextTime.split(":");
    const nextDate = new Date();
    nextDate.setHours(parseInt(hour), parseInt(minute), 0, 0);

    if (nextDate < new Date()) {
        nextDate.setDate(nextDate.getDate() + 1);
    }

    await agenda.schedule(nextDate, "publish-random-post", {
        websiteId,
        time: nextTime,
        scheduleId,
    });
    await schedule.save();
    console.log(`Next publish-random-post scheduled at ${nextTime} for websiteId ${websiteId}`);
}