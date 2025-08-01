const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage }).single('jsonFile');
 
const uploadMiddleware = (req, res, next) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to upload file' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        try {
            const jsonBuffer = req.file.buffer;
            const jsonData = JSON.parse(jsonBuffer.toString('utf8'));
            req.body = jsonData;
            next();
        } catch (error) {
            return res.status(400).json({ error: 'Invalid JSON format' });
        }
    });
};
 
module.exports = uploadMiddleware;