const Settings = require('../models/Settings');

/**
 * @desc    Get all app settings
 * @route   GET /api/settings
 * @access  Public (Partial) or Private (Full)
 */
const getSettings = async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings', error: error.message });
    }
};

/**
 * @desc    Update app settings
 * @route   PUT /api/settings
 * @access  Private (Super Admin)
 */
const updateSettings = async (req, res) => {
    try {
        // Ensure only super-admin can update
        if (!req.admin || req.admin.role !== 'super-admin') {
            return res.status(403).json({ message: 'Only super-admins can update settings' });
        }

        let settings = await Settings.getSettings();
        
        // Update fields
        const updateData = {
            ...req.body,
            updatedBy: req.admin._id
        };

        // If nested objects are sent, merge them correctly
        if (req.body.featureToggles) {
            updateData.featureToggles = { ...settings.featureToggles, ...req.body.featureToggles };
        }
        if (req.body.appVersion) {
            updateData.appVersion = { ...settings.appVersion, ...req.body.appVersion };
        }

        const updatedSettings = await Settings.findOneAndUpdate(
            {},
            updateData,
            { new: true, runValidators: true }
        );

        res.json(updatedSettings);
    } catch (error) {
        res.status(500).json({ message: 'Error updating settings', error: error.message });
    }
};

module.exports = {
    getSettings,
    updateSettings
};
