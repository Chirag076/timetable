const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Room = require('../models/Room');
const Timetable = require('../models/Timetable');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = [
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00',
  '14:00-15:00'
];

async function generateTimetable() {
  try {
    const faculties = await Faculty.find();
    const subjects = await Subject.find();
    const rooms = await Room.find();

    let timetable = [];

    const facultyBusy = {};
    faculties.forEach(f => (facultyBusy[f.name] = {}));

    // Sort subjects for deterministic (not random) order
    subjects.sort((a, b) => a.semester - b.semester || a.name.localeCompare(b.name));

    // 🔹 Distribute subjects evenly across days
    let subjectHours = [];
    for (const sub of subjects) {
      const total = sub.isLab ? Math.ceil(sub.credits / 2) : sub.credits;
      for (let i = 0; i < total; i++) subjectHours.push(sub);
    }

    // Shuffle slightly to avoid repetitive order
    subjectHours = subjectHours.sort((a, b) => a.name.localeCompare(b.name));

    // Create per-day subject rotation (so each day has a mix)
    const perDaySubjects = {};
    DAYS.forEach(day => (perDaySubjects[day] = []));

    let index = 0;
    while (index < subjectHours.length) {
      for (let day of DAYS) {
        if (index < subjectHours.length) {
          perDaySubjects[day].push(subjectHours[index]);
          index++;
        }
      }
    }

    // 🔹 Now assign subjects to actual hours, respecting faculty and room constraints
    for (let day of DAYS) {
      const todaysSubjects = perDaySubjects[day];
      let hourIndex = 0;

      for (let subject of todaysSubjects) {
        const hour = HOURS[hourIndex % HOURS.length];
        const faculty = faculties.find(f => f.subjects.includes(subject.name));
        if (!faculty) continue;

        if (facultyBusy[faculty.name][day]?.includes(hour)) continue;

        const room = rooms.find(
          r =>
            r.type === (subject.isLab ? 'lab' : 'theory') &&
            !timetable.some(t => t.day === day && t.time === hour && t.room === r.name)
        );
        if (!room) continue;

        timetable.push({
          day,
          time: hour,
          subject: subject.name,
          faculty: faculty.name,
          room: room.name
        });

        if (!facultyBusy[faculty.name][day])
          facultyBusy[faculty.name][day] = [];
        facultyBusy[faculty.name][day].push(hour);

        hourIndex++;
      }

      // Fill any empty slots
      for (let hour of HOURS) {
        if (!timetable.some(t => t.day === day && t.time === hour)) {
          timetable.push({
            day,
            time: hour,
            subject: '-',
            faculty: '-',
            room: '-'
          });
        }
      }
    }

    await Timetable.deleteMany();
    await Timetable.insertMany(timetable);
    console.log('✅ Balanced Timetable generated successfully!');
  } catch (err) {
    console.error('❌ Error generating timetable:', err);
  }
}

module.exports = generateTimetable;
