import video from "../model/video.js";
import fs from "fs";
import path from "path";

export const UploadVideo = async (req, res) => {
    try {
        let videoFile = null;
        let thumbnailFile = null;

        // Handle multer files (req.files as array or object, or req.file)
        if (Array.isArray(req.files)) {
            videoFile = req.files.find(
                (f) => f.fieldname === "file" || f.mimetype.startsWith("video/")
            );
            thumbnailFile = req.files.find(
                (f) => f.fieldname === "thumbnail" || f.mimetype.startsWith("image/")
            );
        } else if (req.files && typeof req.files === "object") {
            videoFile = req.files.file?.[0] || req.files.video?.[0];
            thumbnailFile = req.files.thumbnail?.[0];
        } else if (req.file) {
            videoFile = req.file;
        }

        if (!videoFile) {
            return res.status(400).json({ message: "Please upload a valid MP4 video file." });
        }

        let thumbnailPath = "";
        let thumbnailFilename = "";

        if (thumbnailFile) {
            thumbnailPath = thumbnailFile.path.replace(/\\/g, "/");
            thumbnailFilename = thumbnailFile.originalname;
        } else if (req.body.thumbnailData && typeof req.body.thumbnailData === "string" && req.body.thumbnailData.startsWith("data:image/")) {
            // Handle client-generated video frame snapshot (base64)
            try {
                const base64Data = req.body.thumbnailData.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, "base64");
                const filename = `thumb-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
                const uploadDir = "uploads";
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                const savePath = path.join(uploadDir, filename);
                fs.writeFileSync(savePath, buffer);
                thumbnailPath = `uploads/${filename}`;
                thumbnailFilename = filename;
            } catch (thumbErr) {
                console.warn("Error saving base64 thumbnail frame:", thumbErr.message);
            }
        }

        const description = req.body.videodescription || req.body.description || "";
        const category = req.body.category || "All";

        const newVideo = new video({
            videotitle: req.body.videotitle,
            videodescription: description,
            description: description,
            category: category,
            filename: videoFile.originalname,
            filepath: videoFile.path.replace(/\\/g, "/"),
            filetype: videoFile.mimetype,
            filesize: String(videoFile.size),
            videochanel: req.body.videochanel || "My Channel",
            uploader: req.body.uploader || "",
            thumbnailpath: thumbnailPath,
            thumbnailfilename: thumbnailFilename,
        });

        await newVideo.save();
        return res.status(201).json({
            message: "file uploaded successfully",
            video: newVideo,
        });
    } catch (error) {
        console.error("UploadVideo error:", error);
        return res.status(500).json({ message: "Something went wrong during video upload." });
    }
};

export const getallvideo = async (req, res) => {
    try {
        const files = await video.find().sort({ createdAt: -1 });
        return res.status(200).send(files);
    } catch (error) {
        console.error("getallvideo error:", error);
        return res.status(500).json({ message: "Something went wrong fetching videos." });
    }
};