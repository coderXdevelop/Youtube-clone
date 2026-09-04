import express from "express";
import multer from "multer";
import {
    createMeeting,
    getMeetingDetails,
    getUserMeetingHistory,
    uploadMeetingFile,
} from "../controller/meetingController.js";

const storage = multer.diskStorage({
    destination: "uploads",
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `meet-${Date.now()}-${safeName}`);
    },
});
const upload = multer({ storage });

const router = express.Router();

router.post("/create", createMeeting);
router.get("/details/:roomId", getMeetingDetails);
router.get("/history/user/:userId", getUserMeetingHistory);
router.post("/upload-attachment", upload.single("file"), uploadMeetingFile);

export default router;
