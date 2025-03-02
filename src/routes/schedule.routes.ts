import express from "express";
import scheduleController from "../controllers/schedule.controller";

const router = express.Router();

router.post("/schedule-posts", scheduleController.schedulePosts);
router.post("/delete-job", scheduleController.deleteJob);
router.get("/get-all-jobs", scheduleController.getAllJobs);

export default router;