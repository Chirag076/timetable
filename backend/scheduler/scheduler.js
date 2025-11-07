const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Room = require('../models/Room');
const Timetable = require('../models/Timetable');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const MORNING_PERIODS = [
  '08:10-09:05',
  '09:05-10:00',
  '10:20-11:15',
  '11:15-12:10',
  '12:10-13:05'
];

const EVENING_PERIODS = [
  '13:15-14:10',
  '14:10-15:05',
  '15:05-16:00',
  '16:20-17:15',
  '17:15-18:10'
];

const SEMESTER_ROOM_PREF = { 1: 'f1', 3: 'f2', 5: 'f3' };

function parseTime(t) {
  if (!t) return 0;
  const [hh, mm] = t.replace('.', ':').split(':').map(Number);
  return hh * 60 + mm;
}

function isTimeInRange(period, av) {
  const [startStr, endStr] = period.split('-').map(s => s.trim());
  const [avStartStr, avEndStr] = [av.start, av.end];
  const periodStart = parseTime(startStr);
  const periodEnd = parseTime(endStr);
  const avStart = parseTime(avStartStr);
  const avEnd = parseTime(avEndStr);
  return periodStart >= avStart && periodEnd <= avEnd;
}

async function generateTimetable() {
  try {
    const faculties = await Faculty.find();
    const subjects = await Subject.find();
    const rooms = await Room.find();

    const timetable = [];
    const facultyBusy = {};
    const facultyWeeklyLoad = {};

    faculties.forEach(f => {
      facultyBusy[f.name] = {};
      facultyWeeklyLoad[f.name] = 0;
    });

    const batches = [
      { name: 'BCA 1 (M)', semester: 1, periods: MORNING_PERIODS },
      { name: 'BCA 1 (E)', semester: 1, periods: EVENING_PERIODS },
      { name: 'BCA 3 (M)', semester: 3, periods: MORNING_PERIODS },
      { name: 'BCA 3 (E)', semester: 3, periods: EVENING_PERIODS },
      { name: 'BCA 5 (M)', semester: 5, periods: MORNING_PERIODS },
      { name: 'BCA 5 (E)', semester: 5, periods: EVENING_PERIODS }
    ];

    const isFacultyAvailable = (faculty, day, period) => {
      if (!faculty.availability || faculty.availability.length === 0) return true;
      return faculty.availability.some(
        av => av.day.toLowerCase() === day.toLowerCase() && isTimeInRange(period, av)
      );
    };

    const getAvailableRoom = (subject, day, period) => {
      const preferredRoomName = SEMESTER_ROOM_PREF[subject.semester];

      if (preferredRoomName) {
        const preferredRoom = rooms.find(
          r =>
            r.name.toLowerCase() === preferredRoomName.toLowerCase() &&
            !timetable.some(t => t.day === day && t.time === period && t.room === r.name)
        );
        if (preferredRoom) return preferredRoom;
      }

      const otherRoomsSameType = rooms.filter(
        r =>
          r.type === (subject.isLab ? 'lab' : 'class') &&
          r.name.toLowerCase() !== preferredRoomName?.toLowerCase() &&
          !timetable.some(t => t.day === day && t.time === period && t.room === r.name)
      );

      if (otherRoomsSameType.length > 0) return otherRoomsSameType[0];

      return rooms.find(
        r => !timetable.some(t => t.day === day && t.time === period && t.room === r.name)
      );
    };

    // ------------------- MAIN LOGIC -------------------
    for (const batch of batches) {
      const batchSubjects = subjects.filter(s => s.semester === batch.semester);
      if (batchSubjects.length === 0) {
        console.warn(`⚠️ No subjects found for ${batch.name}`);
        continue;
      }

      let subjectHours = [];
      batchSubjects.forEach(sub => {
        for (let i = 0; i < sub.credits; i++) subjectHours.push(sub);
      });

      subjectHours = subjectHours.sort(() => Math.random() - 0.5);
      const dayLoad = Object.fromEntries(DAYS.map(d => [d, 0]));

      for (const subject of subjectHours) {
        const faculty = faculties.find(f =>
          f.subjects.some(subj => subj.toLowerCase() === subject.name.toLowerCase())
        );

        if (!faculty) {
          console.warn(`⚠️ No faculty found for subject ${subject.name}`);
          continue;
        }

        const sortedDays = [...DAYS].sort((a, b) => dayLoad[a] - dayLoad[b]);
        let assigned = false;

        for (const day of sortedDays) {
          for (const period of batch.periods) {
            if (!isFacultyAvailable(faculty, day, period)) continue;

            const lastPeriodIndex = batch.periods.indexOf(period) - 1;
            if (lastPeriodIndex >= 0) {
              const lastPeriod = batch.periods[lastPeriodIndex];
              const lastEntry = timetable.find(
                t => t.day === day && t.time === lastPeriod && t.batch === batch.name
              );
              if (lastEntry && lastEntry.faculty === faculty.name) continue;
            }

            const isFacultyAlreadyAssignedToday = timetable.some(
              t => t.day === day && t.batch === batch.name && t.faculty === faculty.name
            );
            if (isFacultyAlreadyAssignedToday) continue;

            const isSubjectAlreadyAssignedToday = timetable.some(
              t => t.day === day && t.batch === batch.name && t.subject === subject.name
            );
            if (isSubjectAlreadyAssignedToday) continue;

            const dailyLoad = facultyBusy[faculty.name][day]?.length || 0;
            const weeklyLoad = facultyWeeklyLoad[faculty.name];
            if (dailyLoad >= faculty.maxHoursPerDay || weeklyLoad >= faculty.maxHoursPerWeek)
              continue;

            if (facultyBusy[faculty.name][day]?.includes(period)) continue;

            const isBatchBusy = timetable.some(
              t => t.day === day && t.time === period && t.batch === batch.name
            );
            if (isBatchBusy) continue;

            // ✅ FIXED LAB SECTION (PARALLEL CG/CC LABS)
            // ✅ FIXED LAB SECTION (PARALLEL COMBINED ENTRY)
            if (subject.isLab) {
              const labRooms = rooms.filter(r => r.type === 'lab');
              const labSubjects = batchSubjects.filter(s => s.isLab);
              if (labSubjects.length < 2 || labRooms.length < 2) continue;

              const [lab1, lab2] = labSubjects;
              const fac1 = faculties.find(f =>
                f.subjects.some(subj => subj.toLowerCase() === lab1.name.toLowerCase())
              );
              const fac2 = faculties.find(f =>
                f.subjects.some(subj => subj.toLowerCase() === lab2.name.toLowerCase())
              );
              if (!fac1 || !fac2) continue;

              // 🔄 Alternate lab room usage across the week
              const existingLabs = timetable.filter(t => t.batch === batch.name && t.subject.includes('/'));
              const alternate = existingLabs.length % 2 === 1; // swap every other time

              const roomForLab1 = alternate ? labRooms[1] : labRooms[0];
              const roomForLab2 = alternate ? labRooms[0] : labRooms[1];

              const isRoom1Free = !timetable.some(t => t.day === day && t.time === period && t.room.includes(roomForLab1.name));
              const isRoom2Free = !timetable.some(t => t.day === day && t.time === period && t.room.includes(roomForLab2.name));
              if (!isRoom1Free || !isRoom2Free) continue;

              // 🆕 Create ONE combined entry instead of two
              timetable.push({
                day,
                time: period,
                subject: `${lab1.name} / ${lab2.name}`,
                faculty: `${fac1.name} / ${fac2.name}`,
                room: `${roomForLab1.name} / ${roomForLab2.name}`,
                batch: batch.name
              });

              // Mark both faculties busy
              if (!facultyBusy[fac1.name][day]) facultyBusy[fac1.name][day] = [];
              if (!facultyBusy[fac2.name][day]) facultyBusy[fac2.name][day] = [];
              facultyBusy[fac1.name][day].push(period);
              facultyBusy[fac2.name][day].push(period);
              facultyWeeklyLoad[fac1.name]++;
              facultyWeeklyLoad[fac2.name]++;

              assigned = true;
              break;
            }
            else {
              const room = getAvailableRoom(subject, day, period);
              if (!room) continue;

              timetable.push({
                day,
                time: period,
                subject: subject.name,
                faculty: faculty.name,
                room: room.name,
                batch: batch.name
              });

              if (!facultyBusy[faculty.name][day]) facultyBusy[faculty.name][day] = [];
              facultyBusy[faculty.name][day].push(period);
              facultyWeeklyLoad[faculty.name]++;
              dayLoad[day]++;
              assigned = true;
            }

            if (assigned) break;
          }
          if (assigned) break;
        }

        if (!assigned) console.warn(`⚠️ Could not assign subject ${subject.name} for ${batch.name}`);
      }
    }

    if (timetable.length === 0) {
      console.error('❌ No timetable generated. Check faculty-subject mappings and availability.');
      return;
    }

    await Timetable.deleteMany();
    await Timetable.insertMany(timetable);
    console.log(`✅ Timetable generated successfully with ${timetable.length} entries.`);
  } catch (err) {
    console.error('❌ Error generating timetable:', err);
  }
}

module.exports = generateTimetable;
