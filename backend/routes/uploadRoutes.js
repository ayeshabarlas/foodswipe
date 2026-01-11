const express = require('express');
const router = express.Router();
const multer = require('multer');
const { bucket } = require('../config/firebase');
const path = require('path');
const crypto = require('crypto');

// Configure multer for memory storage (we'll upload to Firebase)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max
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
        
        const blobStream = blob.createWriteStream({
            metadata: {
                contentType: file.mimetype
            },
            resumable: false
        });

        blobStream.on('error', (err) => {
            console.error('Firebase Upload Error:', err);
            res.status(500).json({ message: 'Upload failed', error: err.message });
        });

        blobStream.on('finish', async () => {
            // Make the file public (optional, but easier for access)
            try {
                await blob.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                
                console.log('✅ File uploaded to Firebase:', publicUrl);
                res.status(200).json({ 
                    imageUrl: publicUrl,
                    fileName: fileName 
                });
            } catch (makePublicErr) {
                console.error('Error making file public:', makePublicErr);
                // Fallback: Signed URL if public access fails
                const [url] = await blob.getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491'
                });
                res.status(200).json({ imageUrl: url });
            }
        });

        blobStream.end(file.buffer);

    } catch (error) {
        console.error('Upload Route Error:', error);
        res.status(500).json({ message: 'Server error during upload', error: error.message });
    }
});

module.exports = router;
