require('dotenv').config();
const Agenda = require('agenda');

// אתחול ה-Agenda
const agenda = new Agenda({ db: { address: process.env.MONGO_CONNECTION_STRING } });

// הגדרת משימה שקוראת ל-console.log כל דקה
agenda.define('log every minute', async job => {
    console.log('This job runs every minute:', new Date());
});

// הפונקציה הראשית שמפעילה את Agenda
async function run() {
    // התחלת ה-Agenda
    await agenda.start();

    // הגדרת תזמון המשימה להרצה כל דקה
    await agenda.every('1 minute', 'log every minute');

    console.log('Agenda started: job scheduled to run every minute.');
}

run().catch(error => {
    console.error('Failed to start Agenda', error);
    process.exit(1);
});
