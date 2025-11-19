const express = require('express');
const router = express.Router();

const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Room = require('../models/Room');
const Timetable = require('../models/Timetable');
const generateTimetable = require('../scheduler/scheduler');


// =============================
// ⭐ ADD FACULTY (NEW SCHEMA)
// =============================
router.post('/faculty', async (req, res) => {
  try {
    const { name, subjects, batchAssignments, availability, maxHoursPerDay, maxHoursPerWeek } = req.body;

    const faculty = new Faculty({
      name,
      subjects,
      batchAssignments,
      availability,
      maxHoursPerDay,
      maxHoursPerWeek,
    });

    await faculty.save();
    res.send(faculty);

  } catch (err) {
    console.error("Error adding faculty:", err);

    if (err.code === 11000) {
      return res.status(400).send({ message: "Faculty with this name already exists" });
    }

    res.status(500).send({ message: "Error adding faculty" });
  }
});


// =============================
// ⭐ ADD SUBJECT (NEW SCHEMA)
// =============================
router.post('/subject', async (req, res) => {
  try {
    const { name, semester, credits, isLab, students, batchAssignment } = req.body;

    const subject = new Subject({
      name,
      semester,
      credits,
      isLab,
      students,
      batchAssignment
    });

    await subject.save();
    res.send(subject);

  } catch (err) {
    console.error("Error adding subject:", err);

    if (err.code === 11000) {
      return res.status(400).send({
        message: "Subject with same name already exists in this batch"
      });
    }

    res.status(500).send({ message: "Error adding subject" });
  }
});


// =============================
// ⭐ ADD ROOM
// =============================
router.post('/room', async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.send(room);
  } catch (err) {
    console.error("Error adding room:", err);
    res.status(500).send({ message: "Error adding room" });
  }
});


// =============================
// ⭐ GENERATE TIMETABLE
// =============================
router.post('/timetable/generate', async (req, res) => {
  try {
    await generateTimetable();
    res.send({ message: "Timetable generated successfully for ALL batches!" });
  } catch (err) {
    console.error("Timetable generation error:", err);
    res.status(500).send({ message: "Error generating timetable" });
  }
});


// =============================
// ⭐ GET TIMETABLE DROPDOWN OPTIONS
// =============================
router.get("/timetable/options", async (req, res) => {
  try {
    const faculties = await Faculty.find({}, "name _id");
    const subjects = await Subject.find({}, "name _id");
    const rooms = await Room.find({}, "name _id type");

    res.send({ faculties, subjects, rooms });

  } catch (err) {
    console.error("Error fetching dropdown options:", err);
    res.status(500).send({ message: "Error fetching dropdown options" });
  }
});


// =============================
// ⭐ UPDATE TIMETABLE SLOT
// =============================
router.put("/timetable/:id", async (req, res) => {
  try {
    const updated = await Timetable.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).send({ message: "Timetable entry not found" });
    }

    res.send(updated);

  } catch (err) {
    console.error("Update timetable error:", err);

    if (err.code === 11000) {
      return res.status(400).send({
        message: "A class already exists at this day + time for this batch"
      });
    }

    res.status(500).send({ message: "Error updating timetable entry" });
  }
});


// =============================
// ⭐ GET TIMETABLE (OPTIONAL FILTER)
// =============================
router.get('/timetable', async (req, res) => {
  try {
    const { batch } = req.query;
    const filters = batch ? { batch } : {};

    const timetable = await Timetable.find(filters).sort({
      day: 1,
      time: 1
    });

    res.send(timetable);

  } catch (err) {
    console.error("Error fetching timetable:", err);
    res.status(500).send({ message: "Error fetching timetable" });
  }
});


module.exports = router;
