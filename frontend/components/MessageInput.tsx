"use client";

import React, { useRef } from "react";
import { Paperclip, X, Send, Upload } from "lucide-react";

interface MessageInputProps {
  newMessage: string;
  selectedFile: File | null;
  isUserOnline: boolean;
  isUploadingFile?: boolean;
  onMessageChange: (message: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onSendFile: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  onInputFocus: () => void;
  formatFileSize: (bytes: number) => string;
}

export default function MessageInput({
  newMessage,
  selectedFile,
  isUserOnline,
  isUploadingFile = false,
  onMessageChange,
  onSendMessage,
  onSendFile,
  onFileSelect,
  onRemoveFile,
  onInputFocus,
  formatFileSize,
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileTransferMethod = () => {
    if (!selectedFile) return "";

    const isLargeFile = selectedFile.size > 10 * 1024 * 1024;

    if (isLargeFile) {
      return " (Server upload - large file)";
    } else if (!isUserOnline) {
      return " (Server upload - user offline)";
    } else {
      return " (P2P preferred, server fallback)";
    }
  };

  return (
    <>
      {/* Selected File Preview */}
      {selectedFile && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Paperclip className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700 truncate max-w-xs">
                {selectedFile.name}
              </span>
              <span className="text-xs text-gray-500">
                ({formatFileSize(selectedFile.size)})
              </span>
              <span className="text-xs text-blue-600">
                {getFileTransferMethod()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onRemoveFile}
                disabled={isUploadingFile}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="bg-white border-t border-gray-300 p-4 flex-shrink-0">
        <form
          onSubmit={
            selectedFile
              ? (e) => {
                  e.preventDefault();
                  onSendFile();
                }
              : onSendMessage
          }
        >
          <div className="flex space-x-2 sm:space-x-4">
            {/* File Input (Hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={onFileSelect}
              className="hidden"
              accept="*/*"
              disabled={isUploadingFile}
            />

            {/* File Attach Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingFile}
              className="text-gray-500 hover:text-gray-700 p-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Attach file"
            >
              {isUploadingFile ? (
                <Upload className="w-5 h-5 animate-bounce" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>

            {/* Text Input or Send File Button */}
            {!selectedFile ? (
              <>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => onMessageChange(e.target.value)}
                  onFocus={onInputFocus}
                  placeholder="Type a message..."
                  disabled={isUploadingFile}
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isUploadingFile}
                  className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </>
            ) : (
              <button
                type="submit"
                disabled={isUploadingFile}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isUploadingFile ? (
                  <>
                    <Upload className="w-5 h-5 animate-bounce" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send File</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
