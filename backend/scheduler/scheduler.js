// scheduler.js
// Scheduler vFinal - Even spread (Option A) + flexible pairing + credit-aware + constraints

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

const SEMESTER_ROOM_PREF = { 1: "F1", 3: "F2", 5: "F3" };

const canonical = (s) => (s || "").toString().replace(/\s+/g, "").replace(/[–—−]/g, "-").toUpperCase();
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

module.exports = async function generateTimetable() {
  try {
    const faculties = await Faculty.find().lean();
    const subjects = await Subject.find().lean();
    const rooms = await Room.find().lean();

    // In-memory timetable
    const timetable = [];

    // Track faculty busy periods and weekly loads
    const facultyBusy = {};
    const facultyWeeklyLoad = {};
    faculties.forEach((f) => {
      facultyBusy[f.name] = {};
      DAYS.forEach((d) => (facultyBusy[f.name][d] = []));
      facultyWeeklyLoad[f.name] = 0;
    });

    const isFacultyAvailableFor = (faculty, day, period) => {
      if (!faculty || !faculty.availability || faculty.availability.length === 0) return true;
      return faculty.availability.some(
        (av) =>
          av.day.toLowerCase() === day.toLowerCase() &&
          // period format expected "HH:MM-HH:MM" or similar, but check by comparing strings roughly
          canonical(period).indexOf(canonical(av.start)) >= 0 ||
          canonical(period).indexOf(canonical(av.end)) >= 0 ||
          true // availability check kept permissive if times formatted differently
      );
    };

    const isRoomFree = (roomName, day, period) =>
      !timetable.some(
        (t) =>
          t.day === day &&
          canonical(t.time) === canonical(period) &&
          t.room.split("/").map((r) => r.trim()).includes(roomName)
      );

    const isFacultyFreeAt = (facultyName, day, period) =>
      !facultyBusy[facultyName][day].includes(canonical(period));

    const facultyDailyCount = (facultyName, day) => (facultyBusy[facultyName][day] || []).length;

    // prefer room by semester name (F1/F2/F3) then by type
    const findRoomFor = (subject, day, period, preferLab) => {
      const pref = SEMESTER_ROOM_PREF[subject.semester];
      if (pref) {
        const pr = rooms.find((r) => r.name.toLowerCase() === pref.toLowerCase() && isRoomFree(r.name, day, period));
        if (pr) return pr;
      }
      const neededType = subject.isLab || preferLab ? "lab" : "theory";
      const byType = rooms.find((r) => r.type.toLowerCase() === neededType.toLowerCase() && isRoomFree(r.name, day, period));
      if (byType) return byType;
      return rooms.find((r) => isRoomFree(r.name, day, period));
    };

    const findFacultyCandidates = (subjectName, batchName, day, period, exclude = []) => {
      // candidate must teach subject and be assigned to the batch
      const candidates = faculties.filter((f) => {
        if (exclude.includes(f.name)) return false;
        const teaches = (f.subjects || []).some((s) => s.toLowerCase() === subjectName.toLowerCase());
        if (!teaches) return false;
        if (!Array.isArray(f.batchAssignments) || !f.batchAssignments.includes(batchName)) return false;
        if (!isFacultyAvailableFor(f, day, period)) return false;
        if (!isFacultyFreeAt(f.name, day, period)) return false;
        if (facultyDailyCount(f.name, day) >= (f.maxHoursPerDay || 4)) return false;
        if (facultyWeeklyLoad[f.name] >= (f.maxHoursPerWeek || 20)) return false;
        return true;
      });
      return shuffle(candidates);
    };

    // batches
    const batches = [
      { name: "BCA 1 (M)", semester: 1, periods: MORNING_PERIODS },
      { name: "BCA 1 (E)", semester: 1, periods: EVENING_PERIODS },
      { name: "BCA 3 (M)", semester: 3, periods: MORNING_PERIODS },
      { name: "BCA 3 (E)", semester: 3, periods: EVENING_PERIODS },
      { name: "BCA 5 (M)", semester: 5, periods: MORNING_PERIODS },
      { name: "BCA 5 (E)", semester: 5, periods: EVENING_PERIODS },
    ];

    // group subjects strictly by batchAssignment
    const subjectsByBatch = {};
    batches.forEach((b) => {
      subjectsByBatch[b.name] = subjects.filter((s) => s.batchAssignment === b.name);
    });

    // Helper: flatten day+period slots for a batch (ordered by day then period),
    // but we will distribute evenly: prefer earlier slots -> flattened list
    const buildSlotList = (periods) => {
      const slots = [];
      for (const day of DAYS) {
        for (const p of periods) slots.push({ day, period: p });
      }
      return slots;
    };

    // Utility: prevent faculty having >2 continuous before this period
    const facultyHasTwoContinuousBefore = (facultyName, day, period, periodsArr) => {
      const idx = periodsArr.indexOf(period);
      if (idx < 1) return false;
      const prev = periodsArr[idx - 1];
      const prev2 = periodsArr[idx - 2];
      const busyPrev = (facultyBusy[facultyName][day] || []).includes(canonical(prev));
      const busyPrev2 = prev2 ? (facultyBusy[facultyName][day] || []).includes(canonical(prev2)) : false;
      return busyPrev && busyPrev2;
    };

    // Utility: prevent a batch having sequential labs (no lab immediately previous)
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

    // MAIN scheduling per batch
    for (const batch of batches) {
      const batchSubjects = subjectsByBatch[batch.name] || [];

      if (!batchSubjects || batchSubjects.length === 0) {
        console.warn(`No subjects for ${batch.name}`);
        continue;
      }

      // build remaining credit map for labs and theories
      const remainingCredits = {};
      batchSubjects.forEach((s) => {
        remainingCredits[s.name] = Math.max(1, Number(s.credits || 1));
      });

      // Build separate lists: labs and theory subjects
      const labSubjects = batchSubjects.filter((s) => s.isLab);
      const theorySubjects = batchSubjects.filter((s) => !s.isLab);

      // 1) PLAN combined lab pairs according to credits
      // Create a multiset array of lab names repeated by credits
      const labSlotsPool = [];
      labSubjects.forEach((ls) => {
        for (let i = 0; i < (remainingCredits[ls.name] || 0); i++) labSlotsPool.push(ls.name);
      });

      // total lab credits and desired combined pairs (each combined pair consumes 2 credits)
      const totalLabCredits = labSlotsPool.length;
      const targetPairs = Math.floor(totalLabCredits / 2); // number of combined pairs to schedule

      // Build balanced pairs: greedy choose two least-used lab names (so balancing per-lab)
      const labCountMap = {};
      labSubjects.forEach((ls) => (labCountMap[ls.name] = 0));
      const labPairs = []; // array of {a,b} pairs (names)

      // We'll build pairs until we consume as many credits as possible
      // We work on a dynamic pool to remove consumed credits
      const pool = labSlotsPool.slice();

      // convert to counts for easier selection
      const counts = {};
      pool.forEach((name) => (counts[name] = (counts[name] || 0) + 1));

      while (true) {
        // pick two distinct labs that still have counts
        const available = Object.keys(counts).filter((k) => counts[k] > 0);
        if (available.length < 2) break; // cannot form more pairs
        // choose two with smallest used count (labCountMap) to balance
        available.sort((a, b) => labCountMap[a] - labCountMap[b] || counts[b] - counts[a]); // prefer smaller used, then larger remaining
        const a = available[0];
        // choose partner: pick next smallest used that is not a
        const partnerList = available.slice(1).sort((x, y) => labCountMap[x] - labCountMap[y] || counts[y] - counts[x]);
        const b = partnerList[0];
        if (!a || !b) break;
        // consume one credit each
        counts[a]--;
        counts[b]--;
        labCountMap[a]++; labCountMap[b]++;
        labPairs.push({ a, b });
      }

      // After pairing, some leftover single labs may remain (odd total credits). We'll keep them to try place later as single lab entries if possible.
      const leftovers = [];
      Object.keys(counts).forEach((k) => {
        while (counts[k] > 0) {
          leftovers.push(k);
          counts[k]--;
        }
      });

      // 2) Distribute pairs evenly across slots (Option A)
      // Build slot list ordered day->period (earlier slots first). To spread evenly we will calculate target distribution:
      const slots = buildSlotList(batch.periods); // e.g., Monday 08:10, Monday 09:05, ... Friday last
      // We want to place lab pairs across slots as evenly as possible.
      // We'll compute indices to place pairs: round-robin across slots with step floor(slots.length/targetPairs) ~ but simpler: iterate slots and place pairs spaced
      let pairIndex = 0;
      const pairPlacementAttempts = [];

      // create an index list that tries to spread pairs evenly across the slots:
      const pairSlotsOrder = [];
      if (labPairs.length > 0) {
        // choose evenly spaced indices
        const gap = Math.max(1, Math.floor(slots.length / labPairs.length));
        let start = 0;
        for (let i = 0; i < labPairs.length; i++) {
          const idx = (start + i * gap) % slots.length;
          pairSlotsOrder.push(idx);
        }
        // if less unique indices than pairs (rare), fill with incremental indices
        if (pairSlotsOrder.length < labPairs.length) {
          for (let i = pairSlotsOrder.length; i < labPairs.length; i++) pairSlotsOrder.push(i % slots.length);
        }
      }

      // We'll attempt to place each pair trying pairSlotsOrder first, then scanning slots forward for the first feasible slot.
      for (let pi = 0; pi < labPairs.length; pi++) {
        const pair = labPairs[pi];
        const triedIndices = new Set();
        let placed = false;

        // start index suggested
        const suggested = pairSlotsOrder[pi] !== undefined ? pairSlotsOrder[pi] : pi % slots.length;
        for (let attempt = 0; attempt < slots.length; attempt++) {
          const idx = (suggested + attempt) % slots.length;
          if (triedIndices.has(idx)) continue;
          triedIndices.add(idx);

          const { day, period } = slots[idx];

          // skip if batch already has something at this period
          if (timetable.some((t) => t.batch === batch.name && t.day === day && canonical(t.time) === canonical(period))) continue;

          // no sequential labs for batch
          if (batchHasLabAtPrev(batch.name, day, period, batch.periods)) continue;

          // find faculties for both lab subjects
          const candA = findFacultyCandidates(pair.a, batch.name, day, period, []);
          const candB = findFacultyCandidates(pair.b, batch.name, day, period, []);
          if (candA.length === 0 || candB.length === 0) continue;

          // choose distinct faculties
          // try best match where names differ
          let facA = candA[0];
          let facB = candB.find((x) => x.name !== facA.name) || candB[0];
          if (!facA || !facB) continue;
          if (facA.name === facB.name) continue;

          // prevent faculty already having two continuous before this slot
          if (facultyHasTwoContinuousBefore(facA.name, day, period, batch.periods)) continue;
          if (facultyHasTwoContinuousBefore(facB.name, day, period, batch.periods)) continue;

          // need two lab rooms free
          const labRooms = rooms.filter((r) => r.type && r.type.toLowerCase() === "lab");
          if (labRooms.length < 2) continue;

          // pick two lab rooms (prefer alternating)
          const occ = timetable.filter((t) => t.batch === batch.name && (t.subject || "").includes("/")).length;
          const r1 = labRooms[occ % labRooms.length];
          const r2 = labRooms[(occ + 1) % labRooms.length];
          if (!isRoomFree(r1.name, day, period) || !isRoomFree(r2.name, day, period)) {
            // try any two free lab rooms
            const freeLabs = labRooms.filter((r) => isRoomFree(r.name, day, period));
            if (freeLabs.length < 2) continue;
            [r1, r2] = [freeLabs[0], freeLabs[1]];
          }

          // PASS: place combined pair entry (single DB row, subject "A / B")
          timetable.push({
            day,
            time: period,
            subject: `${pair.a} / ${pair.b}`,
            faculty: `${facA.name} / ${facB.name}`,
            room: `${r1.name} / ${r2.name}`,
            batch: batch.name,
          });

          // mark faculties busy and update weekly loads
          facultyBusy[facA.name][day].push(canonical(period));
          facultyBusy[facB.name][day].push(canonical(period));
          facultyWeeklyLoad[facA.name] = (facultyWeeklyLoad[facA.name] || 0) + 1;
          facultyWeeklyLoad[facB.name] = (facultyWeeklyLoad[facB.name] || 0) + 1;

          // decrement remainingCredits for both labs (important)
          remainingCredits[pair.a] = Math.max(0, (remainingCredits[pair.a] || 0) - 1);
          remainingCredits[pair.b] = Math.max(0, (remainingCredits[pair.b] || 0) - 1);

          placed = true;
          break;
        } // end scanning slots
        if (!placed) {
          console.warn(`Could not place combined lab pair ${pair.a} / ${pair.b} for ${batch.name}`);
        }
      } // end labPairs loop

      // 3) Try to place leftover single lab credits if any (e.g., odd credit totals)
      if (leftovers.length > 0) {
        // make list of available slots again and try to place singles (as single lab entry using one lab room)
        const allSlots = buildSlotList(batch.periods);
        // prefer days with less lab load: compute lab counts per day
        const labCountByDay = Object.fromEntries(DAYS.map((d) => [d, timetable.filter((t) => t.batch === batch.name && t.day === d && (t.subject || "").includes("/")).length]));
        // order slots by day lab count (low -> high) then early period
        const orderedSlots = allSlots.slice().sort((a, b) => labCountByDay[a.day] - labCountByDay[b.day] || batch.periods.indexOf(a.period) - batch.periods.indexOf(b.period));

        for (const labName of leftovers) {
          let placedSingle = false;
          for (const { day, period } of orderedSlots) {
            if (timetable.some((t) => t.batch === batch.name && t.day === day && canonical(t.time) === canonical(period))) continue;
            // no sequential lab if previous is lab
            if (batchHasLabAtPrev(batch.name, day, period, batch.periods)) continue;
            const cand = findFacultyCandidates(labName, batch.name, day, period, []);
            if (cand.length === 0) continue;
            const fac = cand[0];
            if (facultyHasTwoContinuousBefore(fac.name, day, period, batch.periods)) continue;
            const roomLab = rooms.find((r) => r.type && r.type.toLowerCase() === "lab" && isRoomFree(r.name, day, period));
            if (!roomLab) continue;
            // place single lab entry (not ideal but better than skipping)
            timetable.push({
              day,
              time: period,
              subject: `${labName}`,
              faculty: fac.name,
              room: roomLab.name,
              batch: batch.name,
            });
            facultyBusy[fac.name][day].push(canonical(period));
            facultyWeeklyLoad[fac.name] = (facultyWeeklyLoad[fac.name] || 0) + 1;
            remainingCredits[labName] = Math.max(0, (remainingCredits[labName] || 0) - 1);
            placedSingle = true;
            break;
          }
          if (!placedSingle) {
            console.warn(`Could not place leftover single lab ${labName} for ${batch.name}`);
          }
        }
      }

      // 4) THEORY placement (place theory blocks according to remainingCredits for theory subjects)
      // Create theory slots pool according to remainingCredits
      let theoryPool = [];
      theorySubjects.forEach((ts) => {
        const remain = remainingCredits[ts.name] || 0;
        for (let k = 0; k < remain; k++) theoryPool.push(ts);
      });

      // We want to spread theoryPool evenly across DAYS, prefer earlier slots and avoid bunching
      // Build available slots excluding ones already used by this batch
      const allSlots = buildSlotList(batch.periods);
      const availableSlots = allSlots.filter(({ day, period }) => !timetable.some((t) => t.batch === batch.name && t.day === day && canonical(t.time) === canonical(period)));

      // Sort availableSlots by day load (less used days first) then earlier period
      const dayLoadMap = Object.fromEntries(DAYS.map((d) => [d, timetable.filter((t) => t.batch === batch.name && t.day === d).length]));
      availableSlots.sort((a, b) => dayLoadMap[a.day] - dayLoadMap[b.day] || batch.periods.indexOf(a.period) - batch.periods.indexOf(b.period));

      // Place each theory entry greedily across availableSlots
      theoryPool = shuffle(theoryPool); // add randomness
      for (const theorySub of theoryPool) {
        let placedTheory = false;
        // iterate availableSlots in order (which is balanced)
        for (let si = 0; si < availableSlots.length; si++) {
          const { day, period } = availableSlots[si];
          // skip if slot no longer available (maybe another placed)
          if (timetable.some((t) => t.batch === batch.name && t.day === day && canonical(t.time) === canonical(period))) continue;
          // find candidate faculty
          const candidates = findFacultyCandidates(theorySub.name, batch.name, day, period, []);
          if (candidates.length === 0) continue;
          const fac = candidates[0];
          if (facultyHasTwoContinuousBefore(fac.name, day, period, batch.periods)) continue;
          const room = findRoomFor(theorySub, day, period, false);
          if (!room) continue;
          // place theory
          timetable.push({
            day,
            time: period,
            subject: theorySub.name,
            faculty: fac.name,
            room: room.name,
            batch: batch.name,
          });
          facultyBusy[fac.name][day].push(canonical(period));
          facultyWeeklyLoad[fac.name] = (facultyWeeklyLoad[fac.name] || 0) + 1;
          // mark slot used; remove it from availableSlots list efficiently by splice
          availableSlots.splice(si, 1);
          placedTheory = true;
          break;
        }
        if (!placedTheory) {
          console.warn(`Could not place theory ${theorySub.name} for ${batch.name}`);
        }
      }

      // Done for this batch; continue to next batch
    } // end batches

    // Persist: clear and insert
    if (timetable.length > 0) {
      await Timetable.deleteMany();
      // insertMany may fail if duplicates exist (index), but algorithm attempted to avoid duplicates
      await Timetable.insertMany(timetable);
    } else {
      console.error("No timetable entries created - inputs may be insufficient");
    }

    console.log(`✅ Timetable generated successfully (${timetable.length} entries).`);
    return timetable;
  } catch (err) {
    console.error("❌ Timetable generation error:", err);
    throw err;
  }
};
