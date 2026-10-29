const express = require("express");
const router = express.Router();
const controller = require("../controllers/locationController");


router.get("/wilayas", controller.getWilayas);
router.get("/wilayas/:wilayaId/communes", controller.getCommunesByWilaya);

module.exports = router;
