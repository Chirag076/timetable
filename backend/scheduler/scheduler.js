const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Room = require('../models/Room');
const Timetable = require('../models/Timetable');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = ['09:00-10:00','10:00-11:00','11:00-12:00','12:00-13:00','13:00-14:00','14:00-15:00'];

function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

async function generateTimetable() {
    try {
        // 1. Fetch data
        const faculties = await Faculty.find();
        const subjects = await Subject.find();
        const rooms = await Room.find();

        // 2. Prepare subject slots based on credits
        let subjectSlots = [];
        subjects.forEach(sub => {
            let hours = sub.isLab ? Math.ceil(sub.credits / 2) : sub.credits; // Lab = half hours
            for (let i = 0; i < hours; i++) {
                subjectSlots.push(sub);
            }
        });

        // 3. Prepare timetable array
        let timetable = [];

        for (let day of DAYS) {
            for (let hour of HOURS) {

                // Shuffle to randomize assignments
                let shuffledSubjects = shuffleArray([...subjectSlots]);
                let assigned = false;

                for (let sub of shuffledSubjects) {
                    // Find available faculty for this subject
                    let fac = faculties.find(f =>
                        f.subjects.includes(sub.name) &&
                        // check if faculty is free this hour
                        !timetable.some(t => t.day === day && t.time === hour && t.faculty === f.name) &&
                        // check last 2 slots to prevent 3 consecutive
                        !timetable.slice(-2).some(t => t.faculty === f.name)
                    );

                    if (!fac) continue;

                    // Find a room
                    let room = rooms.find(r =>
                        r.type === (sub.isLab ? 'lab' : 'theory') &&
                        !timetable.some(t => t.day === day && t.time === hour && t.room === r.name)
                    );

                    if (!room) continue;

                    // Assign slot
                    timetable.push({
                        day,
                        time: hour,
                        subject: sub.name,
                        faculty: fac.name,
                        room: room.name
                    });

                    // Remove this subject slot
                    subjectSlots = subjectSlots.filter(s => s !== sub);
                    assigned = true;
                    break;
                }

                if (!assigned) {
                    // Leave empty slot if no assignment possible
                    timetable.push({ day, time: hour, subject: "-", faculty: "-", room: "-" });
                }
            }
        }

        // 4. Save to MongoDB
        await Timetable.deleteMany(); // remove old timetable
        await Timetable.insertMany(timetable);

        console.log("Timetable generated successfully!");
    } catch (err) {
        console.error("Error generating timetable:", err);
    }
}

module.exports = generateTimetable;
