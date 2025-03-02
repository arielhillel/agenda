import Agenda, { Job } from "agenda";
import axios from "axios";
import Schedule from "../models/Schedule";
import { scheduleNextTask } from "../services/scheduler";

export default function definePublishPostJob(agenda: Agenda, apiBaseUrl: string, password: string) {
    agenda.define("publish-random-post", async (job: Job) => {
        const { websiteId, time, scheduleId } = job.attrs.data as {
            websiteId: string;
            time: string;
            scheduleId: string;
        };

        if (!websiteId) throw new Error("WebsiteId is missing");

        const requestUrl = `${apiBaseUrl}/api/Publish/publish-random-post`;
        const dto = { WebsiteId: websiteId };

        const response = await axios.post(requestUrl, dto, {
            headers: {
                "Content-Type": "application/json",
                "Authorization-Password": password,
            },
        });

        console.log(`publish-random-post website ID: ${websiteId} at time: ${time}`);

        if (response.status !== 200) {
            throw new Error(`Request failed with status code ${response.status}`);
        }

        const schedule = await Schedule.findById(scheduleId);
        if (!schedule) throw new Error("Schedule not found");

        await scheduleNextTask(agenda, schedule.times, websiteId, scheduleId);
        console.log("The random post was published successfully!");
    });
}