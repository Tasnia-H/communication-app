"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Eye,
} from "lucide-react";

interface FileInfo {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface FileMessageProps {
  file: FileInfo;
  className?: string;
}

export default function FileMessage({
  file,
  className = "",
}: FileMessageProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return Image;
    if (mimeType.startsWith("video/")) return Video;
    if (mimeType.startsWith("audio/")) return Music;
    if (
      mimeType.includes("zip") ||
      mimeType.includes("rar") ||
      mimeType.includes("7z")
    )
      return Archive;
    return FileText;
  };

  const getFileTypeColor = (mimeType: string): string => {
    if (mimeType.startsWith("image/")) return "text-green-600 bg-green-50";
    if (mimeType.startsWith("video/")) return "text-purple-600 bg-purple-50";
    if (mimeType.startsWith("audio/")) return "text-blue-600 bg-blue-50";
    if (mimeType.includes("pdf")) return "text-red-600 bg-red-50";
    if (
      mimeType.includes("zip") ||
      mimeType.includes("rar") ||
      mimeType.includes("7z")
    )
      return "text-orange-600 bg-orange-50";
    return "text-gray-600 bg-gray-50";
  };

  const isPreviewable = (mimeType: string): boolean => {
    return mimeType.startsWith("image/") || mimeType === "application/pdf";
  };

  const downloadFile = async () => {
    setIsDownloading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3001/files/${file.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download file");
    } finally {
      setIsDownloading(false);
    }
  };

  const previewFile = async () => {
    if (!isPreviewable(file.mimeType)) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3001/files/${file.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      setShowPreview(true);
    } catch (error) {
      console.error("Preview error:", error);
      alert("Failed to preview file");
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const IconComponent = getFileIcon(file.mimeType);
  const colorClasses = getFileTypeColor(file.mimeType);

  return (
    <>
      <div className={`border rounded-lg p-3 max-w-sm ${className}`}>
        <div className="flex items-start space-x-3">
          {/* File Icon */}
          <div className={`p-2 rounded-lg ${colorClasses} flex-shrink-0`}>
            <IconComponent className="w-6 h-6" />
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.originalName}
            </p>
            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            <p className="text-xs text-gray-400">
              {new Date(file.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 mt-3 pt-2 border-t">
          {isPreviewable(file.mimeType) && (
            <button
              onClick={previewFile}
              className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          )}

          <button
            onClick={downloadFile}
            disabled={isDownloading}
            className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3 h-3" />
            <span>{isDownloading ? "Downloading..." : "Download"}</span>
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            {/* Close Button */}
            <button
              onClick={closePreview}
              className="absolute top-4 right-4 z-10 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-opacity"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Preview Content */}
            <div className="bg-white rounded-lg shadow-xl overflow-hidden max-h-full">
              {file.mimeType.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt={file.originalName}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              ) : file.mimeType === "application/pdf" ? (
                <iframe
                  src={previewUrl}
                  title={file.originalName}
                  className="w-full h-[80vh]"
                />
              ) : null}

              {/* File Info Bar */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {file.originalName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} •{" "}
                      {new Date(file.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={downloadFile}
                    disabled={isDownloading}
                    className="flex items-center space-x-1 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloading ? "Downloading..." : "Download"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
