const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");

const homeData = require("../controllers/patientHomeController");
const doctorsCtrl = require("../controllers/patient/patientDoctorsController");
const appointmentsCtrl = require("../controllers/patient/patientAppointmentsController");

router.use(auth(["patient"]));

router.get("/home", homeData.getHomeData);

/* DOCTORS */
router.get("/doctors/specialties", doctorsCtrl.getSpecialties);
router.get("/doctors/wilayas", doctorsCtrl.getWilayas);
router.get("/doctors", doctorsCtrl.getDoctors);
router.get("/doctors/:id", doctorsCtrl.getDoctorDetail);
router.get("/doctors/:id/slots", doctorsCtrl.getAvailableSlots);

/*  APPOINTMENTS */
router.get("/appointments", appointmentsCtrl.getMyAppointments);
router.post("/appointments", appointmentsCtrl.createAppointment);
router.patch("/appointments/:id/cancel", appointmentsCtrl.cancelAppointment);

module.exports = router;
