// ✅ Comprehensive MIME Type Mapping
const MIME_TYPE_MAP = {
  // 📄 Document Files
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",

  // 🎥 Video Files
  "video/mp4": "mp4",
  "video/x-msvideo": "avi",
  "video/x-matroska": "mkv",
  "video/quicktime": "mov",
  "video/webm": "webm",

  // 🖼️ Image Files
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",

  // 🎨 Adobe / Photoshop Files
  "image/vnd.adobe.photoshop": "psd",
  "application/postscript": "ai",
  "application/illustrator": "ai",

  // 📜 Text & Compressed Files
  "text/plain": "txt",
  "application/zip": "zip",
  "application/x-rar-compressed": "rar",
};

module.exports = MIME_TYPE_MAP;
