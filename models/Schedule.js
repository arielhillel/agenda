const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
    websiteId: {
        type: Number,
        required: true
    },
    times: {
        type: [String],
        required: true
    },
});

const Schedule = mongoose.model('Schedule', ScheduleSchema);
module.exports = Schedule;
