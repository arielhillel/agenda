import express from "express";
import bodyParser from "body-parser";
import Agenda from "agenda";
import { loadEnv, EnvConfig } from "./config/env";
import { connectDB } from "./config/db";
import { authenticate } from "./middleware/auth";
import definePublishPostJob from "./jobs/publishPost";
import scheduleRoutes from "./routes/schedule.routes";

const env: EnvConfig = loadEnv();
const app = express();
const agenda = new Agenda({ db: { address: env.MONGO_CONNECTION_STRING } });

app.use(bodyParser.json());

app.use(authenticate(env.PASSWORD));
app.use("/", scheduleRoutes);

app.locals.agenda = agenda;

definePublishPostJob(agenda, env.API_BASE_URL, env.PASSWORD);

async function start() {
    await connectDB(env.MONGO_CONNECTION_STRING);
    await agenda.start();
    console.log("Agenda started successfully");

    agenda.on("ready", () => console.log("Agenda is ready and connected to MongoDB"));
    agenda.on("error", (error) => console.error("Agenda connection error:", error));

    app.listen(env.PORT, () => {
        console.log(`Server is running on port ${env.PORT}`);
    });
}

start().catch((err) => console.error("Startup error:", err));