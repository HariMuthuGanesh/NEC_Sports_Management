import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: [true, 'Tournament ID is required'],
        index: true
    },
    sportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sport',
        required: [true, 'Sport ID is required'],
        index: true
    },
    name: {
        type: String,
        required: [true, 'Event name is required'],
        trim: true
    },
    category: {
        type: String,
        enum: ['Men', 'Women', 'Mixed', 'Open'],
        default: 'Open'
    },
    registrationStatus: {
        type: String,
        enum: ['Open', 'Closed'],
        default: 'Open'
    },
    minPlayersPerTeam: {
        type: Number,
        default: 1
    },
    maxPlayersPerTeam: {
        type: Number,
        default: 15
    },
    maxTeams: {
        type: Number,
        default: 32
    },
    rules: {
        type: String,
        trim: true
    }
}, { timestamps: true });

const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
export default Event;
