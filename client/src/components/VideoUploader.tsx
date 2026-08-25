"use client";

import { Check, FileVideo, Upload, X, Image as ImageIcon, Sparkles } from "lucide-react";
import React, { ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import axiosInstance from "@/lib/AxiosInstance";
import { AxiosProgressEvent } from "axios";

const CATEGORIES = [
  "All",
  "Music",
  "Gaming",
  "Movies",
  "News",
  "Sports",
  "Technology",
  "Comedy",
  "Education",
  "Science",
  "Travel",
  "Food",
  "Fashion",
];

interface VideoUploaderProps {
  channelId?: string;
  channelName?: string;
  onUploadSuccess?: () => void;
}

const VideoUploader = ({ channelId, channelName, onUploadSuccess }: VideoUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [category, setCategory] = useState("Technology");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [autoThumbnailData, setAutoThumbnailData] = useState<string>("");
  const [uploadComplete, setUploadComplete] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Generate a thumbnail frame from the uploaded video file
  const generateVideoThumbnail = (file: File) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1.0, video.duration / 2 || 0.5);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setAutoThumbnailData(dataUrl);
        }
      } catch (err) {
        console.warn("Could not capture video frame:", err);
      } finally {
        URL.revokeObjectURL(video.src);
      }
    };
  };

  const handlefilechange = (e: ChangeEvent<HTMLInputElement>) => {
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
      const filename = file.name.replace(/\.[^/.]+$/, "");
      if (!videoTitle) {
        setVideoTitle(filename);
      }
      generateVideoThumbnail(file);
    }
  };

  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image file (PNG, JPG, WebP).");
        return;
      }
      setThumbnailFile(file);
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setThumbnailFile(null);
    setAutoThumbnailData("");
    setVideoTitle("");
    setVideoDescription("");
    setCategory("Technology");
    setIsUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (thumbInputRef.current) thumbInputRef.current.value = "";
  };

  const cancelUpload = () => {
    if (isUploading) {
      toast.error("Your video upload has been cancelled");
    }
    resetForm();
  };

  const handleUpload = async () => {
    if (!videoFile || !videoTitle.trim()) {
      toast.error("Please provide video file and title");
      return;
    }

    const formdata = new FormData();
    formdata.append("file", videoFile);
    formdata.append("videotitle", videoTitle.trim());
    formdata.append("videodescription", videoDescription.trim());
    formdata.append("description", videoDescription.trim());
    formdata.append("category", category);
    formdata.append("videochanel", channelName || "My Channel");
    formdata.append("uploader", channelId || "");

    // Add custom thumbnail or auto-captured frame
    if (thumbnailFile) {
      formdata.append("thumbnail", thumbnailFile);
    } else if (autoThumbnailData) {
      formdata.append("thumbnailData", autoThumbnailData);
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      await axiosInstance.post("/api/video/upload", formdata, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progresEvent: AxiosProgressEvent) => {
          if (progresEvent.total) {
            const progress = Math.round(
              (progresEvent.loaded * 100) / progresEvent.total
            );
            setUploadProgress(progress);
          }
        },
      });

      toast.success("Video uploaded successfully!");
      resetForm();
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      toast.error("There was an error uploading your video. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const previewThumbnailSrc = thumbnailFile
    ? URL.createObjectURL(thumbnailFile)
    : autoThumbnailData;

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
        Upload a video
      </h2>

      <div className="space-y-5">
        {!videoFile ? (
          <div
            className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-base font-semibold text-gray-800 dark:text-gray-200">
              Drag and drop video files to upload
            </p>
            <p className="text-xs text-gray-500 mt-1">
              or click to select file
            </p>
            <p className="text-[11px] text-gray-400 mt-3">
              MP4, WebM, MOV or AVI • Up to 100MB
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*"
              onChange={handlefilechange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Video File Card */}
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-gray-200 dark:border-zinc-700">
              <div className="bg-blue-50 dark:bg-blue-950/60 p-2.5 rounded-lg">
                <FileVideo className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">{videoFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {!isUploading && (
                <Button variant="ghost" size="icon" onClick={cancelUpload} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              )}
              {uploadComplete && (
                <div className="bg-green-100 p-1 rounded-full">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              )}
            </div>

            {/* Video Metadata Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-3">
                <div>
                  <Label htmlFor="title" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Title (required)
                  </Label>
                  <Input
                    id="title"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="Add a title that describes your video"
                    disabled={isUploading || uploadComplete}
                    className="mt-1 text-sm bg-white dark:bg-zinc-800"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    placeholder="Tell viewers about your video..."
                    disabled={isUploading || uploadComplete}
                    className="mt-1 min-h-[90px] text-sm resize-none bg-white dark:bg-zinc-800"
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Category
                  </Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={isUploading || uploadComplete}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Thumbnail Section */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Thumbnail (Auto-trimmed or Custom)
                </Label>
                
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black/80 border border-gray-200 dark:border-zinc-700 flex items-center justify-center group">
                  {previewThumbnailSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewThumbnailSrc}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2 text-gray-400">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <span className="text-[11px]">Capturing frame...</span>
                    </div>
                  )}

                  {!thumbnailFile && autoThumbnailData && (
                    <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Auto-trimmed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => thumbInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full text-xs h-8 border-gray-300 dark:border-zinc-700"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {thumbnailFile ? "Change Custom Thumbnail" : "Upload Custom Thumbnail"}
                  </Button>
                  <input
                    type="file"
                    ref={thumbInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                  />
                </div>
                <p className="text-[10px] text-gray-500">
                  If no custom image is uploaded, the automatically trimmed video frame will be used.
                </p>
              </div>
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <span>Uploading to server...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              {!uploadComplete && (
                <>
                  <Button
                    variant="ghost"
                    onClick={cancelUpload}
                    disabled={isUploading}
                    className="text-xs h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || !videoTitle.trim() || uploadComplete}
                    className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5"
                  >
                    {isUploading ? "Uploading..." : "Publish Video"}
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