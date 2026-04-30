const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const homeData = require("../controllers/patientHomeController");

router.use(auth(["patient"]));

// home
router.get("/home", homeData.getHomeData);

module.exports = router;
