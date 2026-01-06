const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    console.log('📁 Creating uploads directory:', uploadDir);
    fs.mkdirSync(uploadDir, { recursive: true });
}

console.log('✅ Upload directory ready:', uploadDir);

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter - accept images, videos, and documents
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg', 'video/ogg', 'video/3gpp', 'video/x-matroska',
        'video/avi', 'video/msvideo', 'video/x-ms-wmv', 'video/x-flv',
        'application/pdf'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, videos, and PDFs are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max
    },
    fileFilter: fileFilter
});

// @desc    Upload an image, video, or document
// @route   POST /api/upload
// @access  Public
router.post('/', (req, res) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 UPLOAD REQUEST RECEIVED');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const uploadSingle = upload.single('file');

    uploadSingle(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            console.error('❌ Multer Error:', err.message);
            return res.status(400).json({
                message: 'Upload error: ' + err.message,
                error: err.code
            });
        } else if (err) {
            console.error('❌ Unknown Error:', err.message);
            return res.status(400).json({
                message: err.message
            });
        }

        try {
            if (!req.file) {
                console.error('❌ No file in request');
                return res.status(400).json({ message: 'No file uploaded' });
            }

            console.log('✅ File received:');
            console.log('  - Filename:', req.file.filename);
            console.log('  - Size:', (req.file.size / 1024).toFixed(2), 'KB');
            console.log('  - Type:', req.file.mimetype);

            // Validate file size based on type
            const fileSize = req.file.size;
            const fileType = req.file.mimetype;

            if (fileType.startsWith('image/')) {
                const maxImageSize = 10 * 1024 * 1024; // 10MB for images
                if (fileSize > maxImageSize) {
                    fs.unlinkSync(req.file.path);
                    console.error('❌ Image too large:', fileSize);
                    return res.status(400).json({ message: 'Image size must be less than 10MB' });
                }
            } else if (fileType === 'application/pdf') {
                const maxDocSize = 5 * 1024 * 1024; // 5MB for documents
                if (fileSize > maxDocSize) {
                    fs.unlinkSync(req.file.path);
                    console.error('❌ Document too large:', fileSize);
                    return res.status(400).json({ message: 'Document size must be less than 5MB' });
                }
            } else if (fileType.startsWith('video/')) {
                const maxVideoSize = 100 * 1024 * 1024; // 100MB for videos
                if (fileSize > maxVideoSize) {
                    fs.unlinkSync(req.file.path);
                    console.error('❌ Video too large:', fileSize);
                    return res.status(400).json({ message: 'Video size must be less than 100MB' });
                }
            }

            // Return the path for the frontend to construct URL
            const filePath = `/uploads/${req.file.filename}`;
            console.log('✅ Upload successful! Path:', filePath);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            const response = {
                message: 'File uploaded successfully',
            };

            if (fileType.startsWith('video/')) {
                response.videoUrl = filePath;
            } else {
                response.imageUrl = filePath;
            }

            res.json(response);
        } catch (error) {
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('❌ UPLOAD ERROR:');
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            res.status(500).json({
                message: 'Server error during upload',
                error: error.message
            });
        }
    });
});

module.exports = router;
