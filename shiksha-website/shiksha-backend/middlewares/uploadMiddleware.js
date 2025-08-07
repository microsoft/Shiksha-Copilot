const busboy = require("busboy");
const path = require("path");
const User = require("../models/user.model.js");
const { uploadToStorage } = require("../services/azure.blob.service.js");

const handleImageUpload = (req, res, file, bb, filename) => {
  let fileSize = 0;
  let fileBuffer = [];
  const maxFileSize = 5 * 1024 * 1024;

  const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg"];

  if (!allowedMimeTypes.includes(filename.mimeType)) {
    file.unpipe(bb);
    return res.status(400).json({ success:false,
      message: "Invalid file type. Only PNG, JPG, and JPEG images are allowed.",
    });
  }

  req.file.sizeExceeded = false;
  file.on("data", (data) => {
    fileSize += data.length;
    if (fileSize > maxFileSize) {
      file.unpipe(bb);
      req.file.sizeExceeded = true;
      return res
        .status(400)
        .json({ error: "File size exceeds the limit of 5 MB" });
    }
    fileBuffer.push(data);
  });

  file.on("end", () => {
    if (fileSize <= maxFileSize) {
      req.file.buffer = Buffer.concat(fileBuffer);
      console.log("Finished processing file.");
    }
  });

  file.on("error", (err) => {
    console.error("Error processing file:", err);
    return res.status(500).json({ error: "Internal server error" });
  });
};

const handleFile = (req, res, file, bb,filename) => {
  let fileSize = 0;
  const maxFileSize = 5 * 1024 * 1024;
  const fileBuffer = [];

  const allowedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ];
  if (!allowedMimeTypes.includes(filename.mimeType)) {
    file.unpipe(bb);
    return res.status(400).json({ success:false,
      message: "Invalid file type. Only Excel files are allowed.",
    });
  }

  file.on("data", (data) => {
    fileSize += data.length;
    if (fileSize > maxFileSize) {
      file.unpipe(bb);
      return res
        .status(400)
        .json({ error: "File size exceeds the limit of 5 MB" });
    }
    fileBuffer.push(data);
  });

  file.on("end", () => {
    if (fileSize <= maxFileSize) {
      req.file.buffer = Buffer.concat(fileBuffer);
      console.log("Finished processing file.");
    }
  });

  file.on("error", (err) => {
    console.error("Error processing file:", err);
    return res.status(500).json({ error: "Internal server error" });
  });
};

const uploadMiddleware = (req, res, next) => {
  if (req.headers?.["content-type"]?.includes("multipart/form-data")) {
    const bb = busboy({ headers: req.headers });
    const userId = req.user._id;
    let fileProvided = false;
    let fileName = "";

    req.file = null;

    bb.on("file", (fieldname, file, filename, encoding, mimetype) => {
      fileProvided = true;
      fileName = filename;
      req.file = { fieldname, filename, encoding, mimetype, buffer: [] };
      try {
        if (req.route.path.includes('/user/upload-profile-image')) {
          handleImageUpload(req, res, file, bb,filename);
        } else {
          handleFile(req, res, file, bb,filename);
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        return res.status(500).json({
          success: false,
          message: "Error uploading file",
          error: error,
        });
      }
    });

    bb.on("finish", async () => {
      if (!fileProvided || req.file?.sizeExceeded) {
        return;
      }

      try {
        const uniqueFilename = `${userId}_photo`;

        req.file.path = await uploadToStorage(
          req.file.buffer,
          uniqueFilename,
          req.file.mimeType
        );

        next();
      } catch (e) {
        res.status(500).json({ message: "Internal server error",e });
      }
    });

    bb.on("error", (err) => {
      console.error("Error parsing form data:", err);
      return res.status(500).json({ error: "Internal server error" });
    });

    req.pipe(bb);
  } else {
    next();
  }
};

module.exports = uploadMiddleware;
