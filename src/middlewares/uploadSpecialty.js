const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = path.join(__dirname, "../../uploads/specialties");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";

    const base = req.params.id
      ? `specialty_${req.params.id}`
      : `specialty_new_${Date.now()}`;
    cb(null, `${base}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/"))
    return cb(new Error("Images uniquement (jpg, png, webp…)"));
  cb(null, true);
};

module.exports = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB — specialty icons don't need more
  fileFilter,
});
