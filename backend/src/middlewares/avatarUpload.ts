import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { ApiError } from "../utils/apiError.js";

const avatarDir = path.resolve(process.cwd(), "uploads", "avatars");
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

fs.mkdirSync(avatarDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, avatarDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase() || ".jpg";
    callback(null, `${randomUUID()}${extension}`);
  }
});

export const avatarUpload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new ApiError(422, "INVALID_AVATAR_TYPE", "Profile picture must be JPG, PNG, WebP, or GIF"));
      return;
    }

    callback(null, true);
  }
});
