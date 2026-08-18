import { Check, FileVideo, Upload, X } from "lucide-react";
import React, { ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
// import axiosInstance from "@/lib/axiosinstance"; // 🔧 Uncomment when backend is ready

interface VideoUploaderProps {
  channelId: string;
  channelName: string;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ channelId, channelName }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith("video/")) {
        toast.error("Please upload a valid video file.");
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error("File size exceeds 100MB limit.");
        return;
      }
      setVideoFile(file);
      if (!videoTitle) setVideoTitle(file.name);
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setVideoTitle("");
    setIsUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelUpload = () => {
    if (isUploading) {
      toast.error("Your video upload has been cancelled");
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!videoFile || !videoTitle.trim()) {
      toast.error("Please provide file and title");
      return;
    }

    // 🔧 TODO: Replace with your backend API call
    // Example:
    // const formData = new FormData();
    // formData.append("file", videoFile);
    // formData.append("videotitle", videoTitle);
    // formData.append("videochannel", channelName);
    // formData.append("uploader", channelId);
    //
    // try {
    //   setIsUploading(true);
    //   setUploadProgress(0);
    //   await axiosInstance.post("/video/upload", formData, {
    //     headers: { "Content-Type": "multipart/form-data" },
    //     onUploadProgress: (progressEvent: ProgressEvent) => {
    //       if (progressEvent.total) {
    //         const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
    //         setUploadProgress(progress);
    //       }
    //     },
    //   });
    //   toast.success("Upload successful");
    //   setUploadComplete(true);
    // } catch (error) {
    //   console.error("Error uploading video:", error);
    //   toast.error("There was an error uploading your video. Please try again.");
    // } finally {
    //   setIsUploading(false);
    // }

    // Temporary mock success until backend is ready:
    setIsUploading(true);
    setTimeout(() => {
      setUploadProgress(100);
      setUploadComplete(true);
      setIsUploading(false);
      toast.success("Mock upload complete (backend pending)");
    }, 2000);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Upload a video</h2>

      <div className="space-y-4">
        {!videoFile ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-lg font-medium">Drag and drop video files to upload</p>
            <p className="text-sm text-gray-500 mt-1">or click to select files</p>
            <p className="text-xs text-gray-400 mt-4">MP4, WebM, MOV or AVI • Up to 100MB</p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className="bg-blue-100 p-2 rounded-md">
                <FileVideo className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{videoFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {!isUploading && !uploadComplete && (
                <Button variant="ghost" size="icon" onClick={resetForm}>
                  <X className="w-5 h-5" />
                </Button>
              )}
              {uploadComplete && (
                <div className="bg-green-100 p-1 rounded-full">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              )}
            </div>

            {/* Title Input */}
            <div>
              <Label htmlFor="title">Title (required)</Label>
              <Input
                id="title"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Add a title that describes your video"
                disabled={isUploading || uploadComplete}
                className="mt-1"
              />
            </div>

            {/* Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              {!uploadComplete && (
                <>
                  <Button onClick={cancelUpload} disabled={!isUploading}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || !videoTitle.trim() || uploadComplete}
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploader;
