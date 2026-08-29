"use strict";
import multer from "multer";

const storage = multer.diskStorage({
    destination: "uploads",
    filename: (req, file, cb) => {
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(
            null,
            new Date().toISOString().replace(/:/g, "-") + "-" + safeOriginalName
        );
    },
});

const filefilter = (req, file, cb) => {
    cb(null, file.mimetype.startsWith("video/") || file.mimetype.startsWith("image/"));
};

const upload = multer({ storage: storage, fileFilter: filefilter });
export default upload;