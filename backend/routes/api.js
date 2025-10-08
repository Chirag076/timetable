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
        res.send({ message: "Timetable generated successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error generating timetable" });
    }
});
// Add Room
router.post('/room', async (req, res) => {
    const room = new Room(req.body);
    await room.save();
    res.send(room);
});

// Get Timetable
router.get('/timetable', async (req, res) => {
    const timetable = await Timetable.find();
    res.send(timetable);
});

module.exports = router;
