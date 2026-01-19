const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const RiderSchema = new mongoose.Schema({
    user: mongoose.Schema.Types.ObjectId,
    cod_balance: { type: Number, default: 0 }
});
const Rider = mongoose.model('Rider', RiderSchema);

async function resetMockup() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const result = await Rider.updateMany(
            { cod_balance: 500 },
            { $set: { cod_balance: 0 } }
        );
        console.log(`Reset ${result.modifiedCount} riders mockup balance to 0`);
        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
}

resetMockup();
