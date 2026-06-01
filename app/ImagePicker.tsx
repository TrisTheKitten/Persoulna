"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  IMAGE_MIME_TYPE_PREFIX,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_COUNT,
} from "@/src/lib/constants";

const MEGABYTE_LABEL = "5 MB";
const DRAG_EVENT_COPY_EFFECT = "copy";

function getUploadError(files: File[]) {
  if (files.length > MAX_IMAGE_UPLOAD_COUNT) {
    return `Select up to ${MAX_IMAGE_UPLOAD_COUNT} images.`;
  }

  if (files.some((file) => file.size > MAX_IMAGE_UPLOAD_BYTES)) {
    return `Each image must be ${MEGABYTE_LABEL} or less.`;
  }

  if (files.some((file) => !file.type.startsWith(IMAGE_MIME_TYPE_PREFIX))) {
    return "Only image files are supported.";
  }

  return null;
}

type SelectedImage = {
  file: File;
  previewUrl: string;
};

export default function ImagePicker() {
  const inputId = useId();
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropTargetRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<File[]>([]);
  const dragDepthRef = useRef(0);

  const addFiles = useCallback((newFiles: File[]) => {
    const combined = [...filesRef.current, ...newFiles];
    const uploadError = getUploadError(combined);

    if (uploadError) {
      setError(uploadError);
      return;
    }

    setError(null);
    setSelectedImages(
      combined.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    );
    filesRef.current = combined;
  }, []);

  useEffect(() => {
    return () => {
      selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [selectedImages]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const form = input.closest("form");
    if (!form) return;
    const handler = (e: FormDataEvent) => {
      for (const file of filesRef.current) {
        e.formData.append("images", file, file.name);
      }
    };
    form.addEventListener("formdata", handler);
    return () => form.removeEventListener("formdata", handler);
  }, []);

  useEffect(() => {
    const dropTarget = dropTargetRef.current?.closest(".composeCard");
    if (!(dropTarget instanceof HTMLElement)) return;

    const handleDragEnter = (event: DragEvent) => {
      event.preventDefault();
      dragDepthRef.current += 1;
      setIsDragging(true);
    };

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = DRAG_EVENT_COPY_EFFECT;
      }
      setIsDragging(true);
    };

    const handleDragLeave = () => {
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);
      addFiles(Array.from(event.dataTransfer?.files ?? []));
    };

    dropTarget.addEventListener("dragenter", handleDragEnter);
    dropTarget.addEventListener("dragover", handleDragOver);
    dropTarget.addEventListener("dragleave", handleDragLeave);
    dropTarget.addEventListener("drop", handleDrop);

    return () => {
      dropTarget.removeEventListener("dragenter", handleDragEnter);
      dropTarget.removeEventListener("dragover", handleDragOver);
      dropTarget.removeEventListener("dragleave", handleDragLeave);
      dropTarget.removeEventListener("drop", handleDrop);
    };
  }, [addFiles]);

  const clearSelectedImages = () => {
    selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setSelectedImages([]);
    filesRef.current = [];
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.previewUrl);
      const updated = prev.filter((_, i) => i !== index);
      filesRef.current = updated.map((img) => img.file);
      return updated;
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
  };

  const triggerSelect = () => {
    inputRef.current?.click();
  };

  const hasFiles = selectedImages.length > 0;
  const remaining = MAX_IMAGE_UPLOAD_COUNT - selectedImages.length;

  return (
    <>
      <div
        ref={dropTargetRef}
        className={`imageDropTarget${isDragging ? " isDragging" : ""}`}
      >
        <div className="circlePickerContainer">
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className={`circlePickerBtn${hasFiles ? " hasFiles" : ""}`}
            onClick={triggerSelect}
            title="Upload images (Up to 4 images, 5 MB each)"
            aria-label="Upload images"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {hasFiles && (
              <span className="pickerCountBadge">{selectedImages.length}</span>
            )}
          </button>
        </div>

        {hasFiles && (
          <div className="pickerPreviewList">
            {selectedImages.map((image, i) => (
              <div key={image.file.name} className="pickerPreviewItem">
                <img
                  src={image.previewUrl}
                  alt={image.file.name}
                  className="pickerPreviewThumb"
                />
                <button
                  type="button"
                  className="pickerPreviewRemove"
                  onClick={() => removeImage(i)}
                  aria-label={`Remove ${image.file.name}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            {remaining > 0 && (
              <button
                type="button"
                className="pickerAddMoreBtn"
                onClick={triggerSelect}
                aria-label="Add more images"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p
          className="fileError"
          style={{
            color: "var(--danger)",
            fontSize: "0.8rem",
            flexBasis: "100%",
          }}
        >
          {error}
        </p>
      )}
    </>
  );
}
