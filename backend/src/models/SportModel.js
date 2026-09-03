import mongoose from 'mongoose';

const sportSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Sport name is required'],
        unique: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['Indoor', 'Outdoor', 'Track', 'Field'],
        required: true
    },
    minPlayers: {
        type: Number,
        required: true,
        min: 1
    },
    maxPlayers: {
        type: Number,
        required: true
    },
    pointsRule: String,
    equipmentRequired: String,
    matchDurationMin: Number
}, { timestamps: true });

const Sport = mongoose.models.Sport || mongoose.model('Sport', sportSchema);
export default Sport;
