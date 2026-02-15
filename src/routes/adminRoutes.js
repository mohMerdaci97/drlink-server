const router = require("express").Router();
const stats = require("../controllers/adminStatsController");
const doctors = require("../controllers/adminDoctorController");
const specialties = require("../controllers/adminSpecialtyController");
const appointments = require("../controllers/adminAppointmentController");

router.get("/stats", stats.getStats);

router.get("/doctors", doctors.getAll);
router.get("/doctors/:id", doctors.getOne);
router.patch("/doctors/:id/approve", doctors.approve);
router.patch("/doctors/:id/reject", doctors.reject);
router.patch("/doctors/:id/toggle", doctors.toggleActive);

router.get("/specialties", specialties.getAll);
router.post("/specialties", specialties.create);
router.put("/specialties/:id", specialties.update);
router.delete("/specialties/:id", specialties.remove);

router.get("/appointments", appointments.getAll);

module.exports = router;
