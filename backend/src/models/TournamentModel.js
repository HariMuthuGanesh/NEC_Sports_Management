import mongoose from 'mongoose';

const tournamentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tournament name is required'],
        trim: true
    },
    academicYear: {
        type: String,
        required: true,
        trim: true
    },
    tier: {
        type: String,
        enum: ['Intramural', 'District', 'Zonal', 'State', 'National'],
        default: 'Intramural'
    },
    organizingBody: String,
    hostInstitution: String,
    locationCity: String,
    startDate: {
        type: Date,
        required: true
    },
    endDate: Date,
    status: {
        type: String,
        enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
        default: 'Upcoming'
    },
    chiefGuest: String,
    sponsorName: String,
    budgetAllocated: {
        type: Number,
        default: 0.00
    }
}, { timestamps: true });

const Tournament = mongoose.models.Tournament || mongoose.model('Tournament', tournamentSchema);
export default Tournament;
