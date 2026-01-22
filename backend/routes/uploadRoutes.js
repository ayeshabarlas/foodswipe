const express = require('express');
const router = express.Router();
const multer = require('multer');
const { bucket } = require('../config/firebase');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Configure multer for memory storage (we'll upload to Firebase)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024
    }
});

/**
 * @desc    Upload file to Firebase Storage
 * @route   POST /api/upload
 */
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const file = req.file;
        const fileName = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`;
        const blob = bucket.file(fileName);
        let responded = false;
        
        const blobStream = blob.createWriteStream({
            metadata: {
                contentType: file.mimetype
            },
            resumable: false
        });

        blobStream.on('error', (err) => {
            if (responded) return;
            const uploadsDir = path.join(__dirname, '..', 'uploads');
            try {
                if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
                const localPath = path.join(uploadsDir, fileName);
                fs.writeFileSync(localPath, file.buffer);
                responded = true;
                return res.status(200).json({
                    imageUrl: `uploads/${fileName}`,
                    videoUrl: `uploads/${fileName}`,
                    fileName,
                    success: true,
                    storage: 'local'
                });
            } catch (fallbackErr) {
                responded = true;
                return res.status(500).json({
                    message: 'Upload failed',
                    error: fallbackErr.message,
                    details: err.code || 'No code',
                    bucket: bucket.name
                });
            }
        });

        blobStream.on('finish', async () => {
            try {
                try {
                    await blob.makePublic();
                } catch (pErr) {
                }

                const [signedUrl] = await blob.getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491'
                });

                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                
                const responseData = {
                    imageUrl: signedUrl || publicUrl,
                    videoUrl: signedUrl || publicUrl,
                    fileName: fileName,
                    success: true,
                    storage: 'firebase'
                };

                console.log('✅ File uploaded to Firebase:', fileName);
                res.status(200).json(responseData);
            } catch (finishErr) {
                console.error('❌ Finish Event Error:', finishErr);
                res.status(500).json({ message: 'Error finalizing upload', error: finishErr.message });
            }
        });

        blobStream.end(file.buffer);

    } catch (error) {
        console.error('Upload Route Error:', error);
        res.status(500).json({ message: 'Server error during upload', error: error.message });
    }
});

module.exports = router;
