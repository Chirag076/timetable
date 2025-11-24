// scheduler.js
// Scheduler vBalanced - credits aware, labs paired, even spread, subject-per-day limits

const Faculty = require("../models/Faculty");
const Subject = require("../models/Subject");
const Room = require("../models/Room");
const Timetable = require("../models/Timetable");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const MORNING_PERIODS = [
  "08:10-09:05",
  "09:05-10:00",
  "10:20-11:15",
  "11:15-12:10",
  "12:10-13:05",
];

const EVENING_PERIODS = [
  "13:15-14:10",
  "14:10-15:05",
  "15:05-16:00",
  "16:20-17:15",
  "17:15-18:10",
];

// Prefer these rooms by semester for theory if free
const SEMESTER_ROOM_PREF = { 1: "F1", 3: "F2", 5: "F3" };

// --------- Helpers ----------
const canonical = (s) =>
  (s || "").toString().replace(/\s+/g, "").replace(/[–—−]/g, "-").toUpperCase();

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Build ordered (day, period) slots: earlier periods first across the week
const buildSlots = (periods) => {
  const slots = [];
  DAYS.forEach((day, di) => {
    periods.forEach((period, pi) => {
      slots.push({ day, period, dayIndex: di, periodIndex: pi });
    });
  });
  // sort primarily by period (08:10 of all days first), then by day
  slots.sort(
    (a, b) =>
      a.periodIndex - b.periodIndex || a.dayIndex - b.dayIndex
  );
  return slots;
};

module.exports = async function generateTimetable() {
  try {
    const faculties = await Faculty.find().lean();
    const subjects = await Subject.find().lean();
    const rooms = await Room.find().lean();

    const timetable = [];

    // Faculty busy map: { [facultyName]: { [day]: [canonicalPeriods...] } }
    const facultyBusy = {};
    const facultyWeeklyLoad = {};
    faculties.forEach((f) => {
      facultyBusy[f.name] = {};
      DAYS.forEach((d) => (facultyBusy[f.name][d] = []));
      facultyWeeklyLoad[f.name] = 0;
    });

    const isFacultyAvailableFor = (faculty, day /*, period */) => {
      // Your availability is usually full day; keep it simple:
      if (!faculty || !faculty.availability || faculty.availability.length === 0)
        return true;
      return faculty.availability.some(
        (av) => av.day.toLowerCase() === day.toLowerCase()
      );
    };

    const isFacultyFreeAt = (facultyName, day, period) =>
      !facultyBusy[facultyName][day].includes(canonical(period));

    const facultyDailyCount = (facultyName, day) =>
      (facultyBusy[facultyName][day] || []).length;

    const isRoomFree = (roomName, day, period) =>
      !timetable.some(
        (t) =>
          t.day === day &&
          canonical(t.time) === canonical(period) &&
          t.room
            .split("/")
            .map((r) => r.trim())
            .includes(roomName)
      );

    const findRoomFor = (subject, day, period, preferLab = false) => {
      const pref = SEMESTER_ROOM_PREF[subject.semester];
      if (pref) {
        const pr = rooms.find(
          (r) =>
            r.name.toLowerCase() === pref.toLowerCase() &&
            isRoomFree(r.name, day, period)
        );
        if (pr) return pr;
      }
      const neededType =
        subject.isLab || preferLab ? "lab" : "theory";

      const byType = rooms.find(
        (r) =>
          (r.type || "").toLowerCase() === neededType.toLowerCase() &&
          isRoomFree(r.name, day, period)
      );
      if (byType) return byType;

      // fallback: any free room
      return rooms.find((r) => isRoomFree(r.name, day, period));
    };

    const findFacultyCandidates = (
      subjectName,
      batchName,
      day,
      period,
      exclude = []
    ) => {
      const candidates = faculties.filter((f) => {
        if (exclude.includes(f.name)) return false;
        const teaches = (f.subjects || []).some(
          (s) => s.toLowerCase() === subjectName.toLowerCase()
        );
        if (!teaches) return false;
        if (
          !Array.isArray(f.batchAssignments) ||
          !f.batchAssignments.includes(batchName)
        )
          return false;
        if (!isFacultyAvailableFor(f, day, period)) return false;
        if (!isFacultyFreeAt(f.name, day, period)) return false;
        if (facultyDailyCount(f.name, day) >= (f.maxHoursPerDay || 4))
          return false;
        if (facultyWeeklyLoad[f.name] >= (f.maxHoursPerWeek || 20))
          return false;
        return true;
      });
      return shuffle(candidates);
    };

    const facultyHasTwoContinuousBefore = (
      facultyName,
      day,
      period,
      periodsArr
    ) => {
      const idx = periodsArr.indexOf(period);
      if (idx < 1) return false;
      const prev = periodsArr[idx - 1];
      const prev2 = periodsArr[idx - 2];
      const busyPrev = facultyBusy[facultyName][day].includes(
        canonical(prev)
      );
      const busyPrev2 = prev2
        ? facultyBusy[facultyName][day].includes(canonical(prev2))
        : false;
      // if previous two are busy, don't allow third in a row
      return busyPrev && busyPrev2;
    };

    const batchHasLabAtPrev = (batchName, day, period, periodsArr) => {
      const idx = periodsArr.indexOf(period);
      if (idx < 1) return false;
      const prev = periodsArr[idx - 1];
      return timetable.some(
        (t) =>
          t.batch === batchName &&
          t.day === day &&
          canonical(t.time) === canonical(prev) &&
          (t.subject || "").toLowerCase().includes("lab")
      );
    };

    // Batches
    const batches = [
      { name: "BCA 1 (M)", semester: 1, periods: MORNING_PERIODS },
      { name: "BCA 1 (E)", semester: 1, periods: EVENING_PERIODS },
      { name: "BCA 3 (M)", semester: 3, periods: MORNING_PERIODS },
      { name: "BCA 3 (E)", semester: 3, periods: EVENING_PERIODS },
      { name: "BCA 5 (M)", semester: 5, periods: MORNING_PERIODS },
      { name: "BCA 5 (E)", semester: 5, periods: EVENING_PERIODS },
    ];

    // group subjects by batchAssignment
    const subjectsByBatch = {};
    batches.forEach((b) => {
      subjectsByBatch[b.name] = subjects.filter(
        (s) => s.batchAssignment === b.name
      );
    });

    // ======= MAIN LOOP PER BATCH =======
    for (const batch of batches) {
      const batchSubjects = subjectsByBatch[batch.name] || [];
      if (!batchSubjects.length) {
        console.warn(`No subjects for ${batch.name}`);
        continue;
      }

      const periodsArr = batch.periods;
      const slots = buildSlots(periodsArr);

      // Credits tracking (per subject name)
      const remainingCredits = {};
      batchSubjects.forEach((s) => {
        remainingCredits[s.name] = Math.max(1, Number(s.credits || 1));
      });

      const labSubjects = batchSubjects.filter((s) => s.isLab);
      const theorySubjects = batchSubjects.filter((s) => !s.isLab);

      // ---------- LAB PAIR PLANNING ----------
      const labCreditsLeft = {};
      labSubjects.forEach(
        (ls) =>
          (labCreditsLeft[ls.name] = remainingCredits[ls.name] || 0)
      );

      const labPairs = []; // {a, b}
      // build balanced pairs while at least 2 labs have credits
      while (true) {
        const availableLabs = Object.keys(labCreditsLeft).filter(
          (name) => labCreditsLeft[name] > 0
        );
        if (availableLabs.length < 2) break;

        // sort labs by remaining credits DESC so higher credit labs get paired first
        availableLabs.sort(
          (a, b) => labCreditsLeft[b] - labCreditsLeft[a]
        );

        const a = availableLabs[0];
        const b = availableLabs[1];
        if (!a || !b) break;

        labPairs.push({ a, b });
        labCreditsLeft[a]--;
        labCreditsLeft[b]--;
      }

      const leftoverSingleLabs = [];
      Object.keys(labCreditsLeft).forEach((name) => {
        for (let i = 0; i < labCreditsLeft[name]; i++) {
          leftoverSingleLabs.push(name);
        }
      });

      // ---------- PLACE LAB PAIRS ----------
      for (const pair of labPairs) {
        let placed = false;

        for (const slot of slots) {
          const { day, period } = slot;

          // slot already used by this batch?
          if (
            timetable.some(
              (t) =>
                t.batch === batch.name &&
                t.day === day &&
                canonical(t.time) === canonical(period)
            )
          )
            continue;

          // avoid back-to-back labs (this batch)
          if (batchHasLabAtPrev(batch.name, day, period, periodsArr))
            continue;

          // find faculties
          const candA = findFacultyCandidates(
            pair.a,
            batch.name,
            day,
            period,
            []
          );
          const candB = findFacultyCandidates(
            pair.b,
            batch.name,
            day,
            period,
            []
          );

          if (!candA.length || !candB.length) continue;

          let facA = candA[0];
          let facB =
            candB.find((f) => f.name !== facA.name) || candB[0];

          if (!facA || !facB) continue;
          if (facA.name === facB.name) continue;

          // faculty cont. limit
          if (
            facultyHasTwoContinuousBefore(
              facA.name,
              day,
              period,
              periodsArr
            )
          )
            continue;
          if (
            facultyHasTwoContinuousBefore(
              facB.name,
              day,
              period,
              periodsArr
            )
          )
            continue;

          // need two lab rooms
          // find two free lab rooms
const labRooms = rooms.filter((r) => r.type.toLowerCase() === "lab");

// skip if not enough labs
if (labRooms.length < 2) continue;

// find all free labs at this moment
const freeLabs = labRooms.filter((r) => isRoomFree(r.name, day, period));
if (freeLabs.length < 2) continue;

// Count ANY previous lab activity for this batch (single or combined)
const totalLabPlaced = timetable.filter(
  (t) =>
    t.batch === batch.name &&
    t.subject &&
    t.subject.toLowerCase().includes("lab")
).length;

// Alternate LAB ROOM ORDER properly
let r1, r2;
if (totalLabPlaced % 2 === 0) {
  r1 = freeLabs[0];
  r2 = freeLabs[1];
} else {
  r1 = freeLabs[1];
  r2 = freeLabs[0];
}


          // place combined entry
          timetable.push({
            day,
            time: period,
            subject: `${pair.a} / ${pair.b}`,
            faculty: `${facA.name} / ${facB.name}`,
            room: `${r1.name} / ${r2.name}`,
            batch: batch.name,
          });

          facultyBusy[facA.name][day].push(canonical(period));
          facultyBusy[facB.name][day].push(canonical(period));
          facultyWeeklyLoad[facA.name] =
            (facultyWeeklyLoad[facA.name] || 0) + 1;
          facultyWeeklyLoad[facB.name] =
            (facultyWeeklyLoad[facB.name] || 0) + 1;

          // decrement remainingCredits for both labs
          remainingCredits[pair.a] = Math.max(
            0,
            (remainingCredits[pair.a] || 0) - 1
          );
          remainingCredits[pair.b] = Math.max(
            0,
            (remainingCredits[pair.b] || 0) - 1
          );

          placed = true;
          break;
        }

        if (!placed) {
          console.warn(
            `Could not place lab pair ${pair.a} / ${pair.b} for ${batch.name}`
          );
        }
      }

      // Optional: try to place leftover single labs if any (rare)
      for (const labName of leftoverSingleLabs) {
        if ((remainingCredits[labName] || 0) <= 0) continue;

        let placedSingle = false;
        for (const slot of slots) {
          const { day, period } = slot;
          if (
            timetable.some(
              (t) =>
                t.batch === batch.name &&
                t.day === day &&
                canonical(t.time) === canonical(period)
            )
          )
            continue;
          if (batchHasLabAtPrev(batch.name, day, period, periodsArr))
            continue;

          const cand = findFacultyCandidates(
            labName,
            batch.name,
            day,
            period,
            []
          );
          if (!cand.length) continue;
          const fac = cand[0];

          if (
            facultyHasTwoContinuousBefore(
              fac.name,
              day,
              period,
              periodsArr
            )
          )
            continue;

          const roomLab = rooms.find(
            (r) =>
              (r.type || "").toLowerCase() === "lab" &&
              isRoomFree(r.name, day, period)
          );
          if (!roomLab) continue;

          timetable.push({
            day,
            time: period,
            subject: labName,
            faculty: fac.name,
            room: roomLab.name,
            batch: batch.name,
          });

          facultyBusy[fac.name][day].push(canonical(period));
          facultyWeeklyLoad[fac.name] =
            (facultyWeeklyLoad[fac.name] || 0) + 1;
          remainingCredits[labName] = Math.max(
            0,
            (remainingCredits[labName] || 0) - 1
          );
          placedSingle = true;
          break;
        }

        if (!placedSingle) {
          console.warn(
            `Could not place leftover single lab ${labName} for ${batch.name}`
          );
        }
      }

      // ---------- THEORY PLACEMENT ----------
      // Build theory pool according to remainingCredits
      let theoryPool = [];
      theorySubjects.forEach((ts) => {
        const cnt = remainingCredits[ts.name] || 0;
        for (let i = 0; i < cnt; i++) theoryPool.push(ts);
      });

      theoryPool = shuffle(theoryPool);

      // Track subject count per day for this batch => to avoid 1-2 subjects dominating
      const daySubjectCount = {};
      DAYS.forEach((d) => (daySubjectCount[d] = {}));
      // Initialize from already placed entries (labs also count subject distributions)
      timetable
        .filter((t) => t.batch === batch.name)
        .forEach((t) => {
          const day = t.day;
          // if combined "A / B", count both
          const subjectsInCell = (t.subject || "")
            .split("/")
            .map((s) => s.trim());
          subjectsInCell.forEach((sub) => {
            if (!daySubjectCount[day][sub]) daySubjectCount[day][sub] = 0;
            daySubjectCount[day][sub] += 1;
          });
        });

      // total classes per day for this batch
      const dayTotal = {};
      DAYS.forEach(
        (d) =>
          (dayTotal[d] = timetable.filter(
            (t) => t.batch === batch.name && t.day === d
          ).length)
      );

      const MAX_PER_SUBJECT_PER_DAY = 2; // your constraint

      for (const theorySub of theoryPool) {
        let placedTheory = false;

        // Always recompute list of free slots for this batch
        const freeSlots = slots.filter(
          ({ day, period }) =>
            !timetable.some(
              (t) =>
                t.batch === batch.name &&
                t.day === day &&
                canonical(t.time) === canonical(period)
            )
        );

        // Sort free slots by:
        // 1) fewer total classes that day (even spread)
        // 2) earlier period
        freeSlots.sort(
          (a, b) =>
            dayTotal[a.day] - dayTotal[b.day] ||
            a.periodIndex - b.periodIndex
        );

        for (const { day, period } of freeSlots) {
          const currentCount =
            daySubjectCount[day][theorySub.name] || 0;
          if (currentCount >= MAX_PER_SUBJECT_PER_DAY) continue;

          const candidates = findFacultyCandidates(
            theorySub.name,
            batch.name,
            day,
            period,
            []
          );
          if (!candidates.length) continue;
          const fac = candidates[0];

          if (
            facultyHasTwoContinuousBefore(
              fac.name,
              day,
              period,
              periodsArr
            )
          )
            continue;

          const room = findRoomFor(theorySub, day, period, false);
          if (!room) continue;

          timetable.push({
            day,
            time: period,
            subject: theorySub.name,
            faculty: fac.name,
            room: room.name,
            batch: batch.name,
          });

          facultyBusy[fac.name][day].push(canonical(period));
          facultyWeeklyLoad[fac.name] =
            (facultyWeeklyLoad[fac.name] || 0) + 1;

          // update daySubjectCount and dayTotal
          if (!daySubjectCount[day][theorySub.name])
            daySubjectCount[day][theorySub.name] = 0;
          daySubjectCount[day][theorySub.name] += 1;
          dayTotal[day] += 1;

          placedTheory = true;
          break;
        }

        if (!placedTheory) {
          console.warn(
            `Could not place theory ${theorySub.name} for ${batch.name}`
          );
        }
      }
    } // end batches loop

    if (!timetable.length) {
      console.error("No timetable entries created - check data");
      return;
    }

    await Timetable.deleteMany();
    await Timetable.insertMany(timetable);
    console.log(
      `✅ Timetable generated successfully (${timetable.length} entries).`
    );
    return timetable;
  } catch (err) {
    console.error("❌ Timetable generation error:", err);
    throw err;
  }
};
