const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: "uploads/doctors/",
  filename: (_, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (_, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only images allowed"), false);
  }
  cb(null, true);
};

module.exports = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, //  2MB max
  fileFilter,
});
