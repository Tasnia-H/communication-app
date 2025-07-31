"use client";

import { useState, useRef } from "react";
import {
  Paperclip,
  X,
  Upload,
  FileText,
  Image,
  Video,
  Music,
  Archive,
} from "lucide-react";

interface FileUploadProps {
  onFileSelect: (fileData: FileData) => void;
  disabled?: boolean;
}

interface FileData {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface FilePreview {
  file: File;
  preview?: string;
  type: "image" | "video" | "audio" | "document" | "archive" | "other";
}

export default function FileUpload({
  onFileSelect,
  disabled = false,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const ALLOWED_TYPES = {
    // Images
    "image/jpeg": { type: "image" as const, icon: Image },
    "image/png": { type: "image" as const, icon: Image },
    "image/gif": { type: "image" as const, icon: Image },
    "image/webp": { type: "image" as const, icon: Image },
    "image/svg+xml": { type: "image" as const, icon: Image },

    // Documents
    "application/pdf": { type: "document" as const, icon: FileText },
    "application/msword": { type: "document" as const, icon: FileText },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      type: "document" as const,
      icon: FileText,
    },
    "application/vnd.ms-excel": { type: "document" as const, icon: FileText },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      type: "document" as const,
      icon: FileText,
    },
    "application/vnd.ms-powerpoint": {
      type: "document" as const,
      icon: FileText,
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      { type: "document" as const, icon: FileText },
    "text/plain": { type: "document" as const, icon: FileText },
    "text/csv": { type: "document" as const, icon: FileText },

    // Archives
    "application/zip": { type: "archive" as const, icon: Archive },
    "application/x-rar-compressed": { type: "archive" as const, icon: Archive },
    "application/x-7z-compressed": { type: "archive" as const, icon: Archive },

    // Audio
    "audio/mpeg": { type: "audio" as const, icon: Music },
    "audio/wav": { type: "audio" as const, icon: Music },
    "audio/ogg": { type: "audio" as const, icon: Music },

    // Video
    "video/mp4": { type: "video" as const, icon: Video },
    "video/mpeg": { type: "video" as const, icon: Video },
    "video/quicktime": { type: "video" as const, icon: Video },
    "video/webm": { type: "video" as const, icon: Video },
  };

  const getFileType = (mimeType: string): FilePreview["type"] => {
    return (
      ALLOWED_TYPES[mimeType as keyof typeof ALLOWED_TYPES]?.type || "other"
    );
  };

  const getFileIcon = (mimeType: string) => {
    return (
      ALLOWED_TYPES[mimeType as keyof typeof ALLOWED_TYPES]?.icon || FileText
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const createPreview = (file: File): FilePreview => {
    const fileType = getFileType(file.type);
    const preview: FilePreview = { file, type: fileType };

    if (fileType === "image") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview((prev) =>
          prev ? { ...prev, preview: e.target?.result as string } : null
        );
      };
      reader.readAsDataURL(file);
    }

    return preview;
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES]) {
      alert(`File type ${file.type} is not supported`);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      alert(`File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`);
      return;
    }

    const preview = createPreview(file);
    setFilePreview(preview);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const uploadFile = async () => {
    if (!filePreview) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", filePreview.file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/files/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      const fileData: FileData = await response.json();
      onFileSelect(fileData);

      // Clear the preview
      setFilePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const cancelUpload = () => {
    setFilePreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative">
      {/* File Input Button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Attach file"
      >
        <Paperclip className="w-5 h-5" />
      </button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        className="hidden"
        accept={Object.keys(ALLOWED_TYPES).join(",")}
      />

      {/* File Preview Modal */}
      {filePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Attach File</h3>
              <button
                onClick={cancelUpload}
                className="text-gray-400 hover:text-gray-600"
                disabled={isUploading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {/* File Preview */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {filePreview.type === "image" && filePreview.preview ? (
                  <img
                    src={filePreview.preview}
                    alt={filePreview.file.name}
                    className="max-w-full max-h-48 mx-auto rounded"
                  />
                ) : (
                  <div className="flex flex-col items-center">
                    {(() => {
                      const IconComponent = getFileIcon(filePreview.file.type);
                      return (
                        <IconComponent className="w-12 h-12 text-gray-400 mb-2" />
                      );
                    })()}
                    <p className="text-sm font-medium text-gray-900 truncate max-w-full">
                      {filePreview.file.name}
                    </p>
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Size:</span>
                  <span className="text-gray-900">
                    {formatFileSize(filePreview.file.size)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Type:</span>
                  <span className="text-gray-900">{filePreview.file.type}</span>
                </div>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 p-4 border-t">
              <button
                onClick={cancelUpload}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={uploadFile}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploading ? "Uploading..." : "Upload"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
