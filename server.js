require('dotenv').config();
const express = require("express");
const axios = require("axios");
const Agenda = require("agenda");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const Schedule = require('./models/Schedule');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const MONGO_CONNECTION_STRING = process.env.MONGO_CONNECTION_STRING;

mongoose.connect(MONGO_CONNECTION_STRING).then(() => {
    console.log("Connected to MongoDB via Mongoose");
}).catch(err => {
    console.error("Mongoose connection error:", err);
});

const agenda = new Agenda({ db: { address: MONGO_CONNECTION_STRING } });

const PASSWORD = process.env.PASSWORD;

const authenticate = (req, res, next) => {
    const authPassword = req.headers["authorization-password"];
    if (authPassword && authPassword === PASSWORD) {
        next();
    } else {
        res.status(403).json({ error: "Unauthorized: Incorrect or missing password" });
    }
};

app.use(authenticate);

function getNextValidTimes(times) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return times.map(time => {
        const [hour, minute] = time.split(":");
        let date = new Date(today);
        date.setHours(hour, minute, 0, 0);

        if (date <= now) {
            date = new Date(tomorrow);
            date.setHours(hour, minute, 0, 0);
        }

        return { time, date };
    }).filter(t => t.date > now)
        .sort((a, b) => a.date - b.date)
        .map(t => t.time);
}

async function scheduleNextTask(agenda, times, websiteId, scheduleId) {
    const schedule = await Schedule.findById(scheduleId);

    const nextValidTimes = getNextValidTimes(times);
    if (nextValidTimes.length > 0) {
        const nextTime = nextValidTimes[0];
        const [hour, minute] = nextTime.split(':');
        const nextDate = new Date();
        nextDate.setHours(hour, minute, 0, 0);

        if (nextDate < new Date()) {
            nextDate.setDate(nextDate.getDate() + 1);
        }

        await agenda.schedule(nextDate, 'publish-random-post', { websiteId, time: nextTime, scheduleId: scheduleId });
        await schedule.save();
        console.log(`Next publish-random-post scheduled at ${nextTime} for websiteId ${websiteId}`);
    }
}

agenda.define("publish-random-post", async (job) => {
    try {
        const { websiteId, time, scheduleId } = job.attrs.data;
        if (!websiteId) {
            throw new Error("WebsiteId is missing");
        }

        const API_BASE_URL = process.env.API_BASE_URL;
        const requestUrl = `${API_BASE_URL}/api/Publish/publish-random-post`;
        const dto = { WebsiteId: websiteId };

        const response = await axios.post(requestUrl, dto, {
            headers: {
                "Content-Type": "application/json",
                "Authorization-Password": PASSWORD,
            },
        });
        console.log(`publish-random-post website ID: ${websiteId} at time: ${time}`);


        if (response.status !== 200) {
            throw new Error(`Request failed with status code ${response.status}`);
        }

        const schedule = await Schedule.findById(scheduleId);
        await scheduleNextTask(agenda, schedule.times, websiteId, scheduleId);

        console.log("The random post was published successfully!");
    } catch (error) {
        console.error("Error while publishing the random post:", error.message);
        throw error;
    }
});

app.post("/scheduleTimes", async (req, res) => {
    const { times, websiteId } = req.body;

    if (!Array.isArray(times) || times.length === 0) {
        return res.status(400).json({ error: "Times array is missing or empty" });
    }
    if (!websiteId) {
        return res.status(400).json({ error: "WebsiteId is missing" });
    }

    let schedule = await Schedule.findOne({ websiteId });
    if (schedule) {
        schedule.times = [...new Set([...schedule.times, ...times])].sort();
    } else {
        schedule = new Schedule({ websiteId, times });
    }
    await schedule.save();

    await agenda.cancel({ 'data.websiteId': websiteId });

    await scheduleNextTask(agenda, schedule.times, websiteId, schedule._id);

    console.log(`Updated schedule saved for websiteId ${websiteId} with times: ${schedule.times.join(", ")}`);
    res.json({ message: "Schedule updated and next job scheduled successfully.", nextTimes: schedule.times });
});

app.post("/cancelSchedule", async (req, res) => {
    const { time, websiteId } = req.body;

    if (!time || !websiteId) {
        return res.status(400).json({ error: "Time or WebsiteId is missing" });
    }

    const schedule = await Schedule.findOne({ websiteId });
    if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
    }

    const jobIndex = schedule.times.findIndex(t => t === time);
    if (jobIndex === -1) {
        return res.status(404).json({ error: "Time not found in schedule" });
    }


    if (getNextValidTimes(schedule.times)[0] === time) {
        await agenda.cancel({
            'data.time': time,
        });

        schedule.times.splice(jobIndex, 1);
        await schedule.save();

        await scheduleNextTask(agenda, schedule.times, websiteId, schedule._id);
    } else {
        schedule.times.splice(jobIndex, 1);
        await schedule.save();
    }

    res.json({
        message: "Time cancelled successfully",
        updatedSchedule: schedule.times
    });
});

app.get("/getScheduledTimes", async (req, res) => {
    const { websiteId } = req.query;

    if (!websiteId) {
        return res.status(400).json({ error: "WebsiteId is required" });
    }

    const schedule = await Schedule.findOne({ websiteId });
    if (!schedule) {
        return res.json([]);
    }

    res.json({
        websiteId: websiteId,
        scheduledTimes: schedule.times
    });
});


(async function () {
    await agenda.start();
    console.log("Agenda started successfully");
    agenda.on('ready', () => console.log('Agenda is ready and connected to MongoDB'));
    agenda.on('error', error => console.error('Agenda connection error:', error));
})();

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
