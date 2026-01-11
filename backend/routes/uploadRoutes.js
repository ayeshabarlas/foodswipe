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
            console.error('❌ Firebase Upload Stream Error:', err);
            // More descriptive error for common Firebase issues
            let errorMsg = 'Upload failed';
            if (err.code === 403) errorMsg = 'Permission denied (Firebase). Check if service account has Storage Admin role.';
            if (err.code === 404) errorMsg = `Storage bucket not found (${bucket.name}). Check FIREBASE_STORAGE_BUCKET env var.`;
            
            res.status(500).json({ 
                message: errorMsg, 
                error: err.message,
                details: err.code || 'No code',
                bucket: bucket.name
            });
        });

        blobStream.on('finish', async () => {
            try {
                // Try to make public, but don't fail if it doesn't work
                try {
                    await blob.makePublic();
                } catch (pErr) {
                    console.warn('⚠️ Could not make file public (using signed URL instead):', pErr.message);
                }

                // Always provide a signed URL as fallback/primary if public fails
                const [signedUrl] = await blob.getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491'
                });

                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                
                // Return BOTH imageUrl and videoUrl for frontend compatibility
                const responseData = {
                    imageUrl: signedUrl || publicUrl,
                    videoUrl: signedUrl || publicUrl,
                    fileName: fileName,
                    success: true
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
