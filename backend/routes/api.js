const express = require('express');
const router = express.Router();

const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Room = require('../models/Room');
const Timetable = require('../models/Timetable');
const generateTimetable = require('../scheduler/scheduler');
// Add Faculty
router.post('/faculty', async (req, res) => {
    const faculty = new Faculty(req.body);
    await faculty.save();
    res.send(faculty);
});

// Add Subject
router.post('/subject', async (req, res) => {
    const subject = new Subject(req.body);
    await subject.save();
    res.send(subject);
});
router.post('/timetable/generate', async (req, res) => {
    try {
        await generateTimetable();
        res.send({ message: "Timetable generated for all batches!" });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error generating timetable" });
    }
});
// 🔹 Get dropdown options for editing timetable
router.get("/timetable/options", async (req, res) => {
  try {
    const faculties = await Faculty.find({}, "name _id");
    const subjects = await Subject.find({}, "name _id");
    const rooms = await Room.find({}, "name _id type");
    res.send({ faculties, subjects, rooms });
  } catch (err) {
    console.error("Error fetching options:", err);
    res.status(500).send({ message: "Error fetching dropdown options" });
  }
});

// 🔹 Update a timetable entry (used by frontend dropdown edits)
router.put("/timetable/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body; // e.g., { subject: 'CG', faculty: 'Harsha' }

    const updated = await Timetable.findByIdAndUpdate(id, updateData, { new: true });

    if (!updated) return res.status(404).send({ message: "Timetable entry not found" });

    res.send(updated);
  } catch (err) {
    console.error("Error updating timetable:", err);
    res.status(500).send({ message: "Error updating timetable entry" });
  }
});


// Add Room
router.post('/room', async (req, res) => {
    const room = new Room(req.body);
    await room.save();
    res.send(room);
});

// Get Timetable
// Get Timetable (optionally filtered by batch)
router.get('/timetable', async (req, res) => {
  try {
    const { batch } = req.query; // e.g., batch=BCA 5M

    let query = {};
    if (batch) {
      query.batch = batch;
    }

    const timetable = await Timetable.find(query).sort({ day: 1, time: 1 });
    res.send(timetable);
  } catch (err) {
    console.error('Error fetching timetable:', err);
    res.status(500).send({ message: 'Error fetching timetable' });
  }
});


module.exports = router;
