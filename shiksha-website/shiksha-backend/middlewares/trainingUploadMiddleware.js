const busboy = require("busboy");
const { uploadToStorage } = require("../services/azure.blob.service.js");

const trainingUploadMiddleware = (req, res, next) => {
  if (!req.headers["content-type"]?.includes("multipart/form-data")) {
    return next();
  }

  const bb = busboy({ headers: req.headers });
  req.body = {};
  req.files = {};
  const uploadTasks = []; 

  bb.on("field", (fieldname, value) => {
    req.body[fieldname] = value;
  });

  bb.on("file", (fieldname, file, info) => {
    const { filename, encoding, mimeType } = info;

    const fileBuffer = [];
    let fileSize = 0;
    const maxFileSize = 10 * 1024 * 1024; // 10MB max

    const uploadPromise = new Promise((resolve, reject) => {
      file.on("data", (data) => {
        fileSize += data.length;
        if (fileSize > maxFileSize) {
          file.unpipe(bb);
          return reject(`${fieldname} file exceeds 10MB limit`);
        }
        fileBuffer.push(data);
      });

      file.on("end", async () => {
        try {
          const buffer = Buffer.concat(fileBuffer);
          const uniqueFilename = `${Date.now()}_${filename}`;

          const path = await uploadToStorage(buffer, uniqueFilename, mimeType);

          const fileData = {
            originalName: filename,
            mimeType,
            encoding,
            path,
          };

          if (req.files[fieldname]) {
            req.files[fieldname].push(fileData);
          } else {
            req.files[fieldname] = [fileData];
          }

          resolve();
        } catch (err) {
          reject(err);
        }
      });

      file.on("error", (err) => {
        reject(err);
      });
    });

    uploadTasks.push(uploadPromise);
  });

  bb.on("finish", async () => {
    try {
      await Promise.all(uploadTasks);
      next();
    } catch (err) {
      console.error("File upload failed:", err);
      res.status(500).json({ success: false, message: "File upload failed", error: err.toString() });
    }
  });

  bb.on("error", (err) => {
    console.error("Busboy error:", err);
    res.status(500).json({ success: false, message: "Busboy parsing error", error: err.toString() });
  });

  req.pipe(bb);
};

module.exports = trainingUploadMiddleware;
