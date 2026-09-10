import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true,
        index: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        index: true
    },
    sportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sport',
        required: true,
        index: true
    },
    teamAId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
        index: true
    },
    teamBId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
        index: true
    },
    venueId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Venue'
    },
    scheduledTime: {
        type: Date,
        required: true
    },
    round: {
        type: String,
        enum: ['League', 'Quarter-Final', 'Semi-Final', 'Final']
    },
    scoreA: {
        type: Number,
        default: 0
    },
    scoreB: {
        type: Number,
        default: 0
    },
    winnerTeamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    manOfMatchStudentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    },
    umpireName: String,
    status: {
        type: String,
        enum: ['Scheduled', 'Ongoing', 'Completed', 'Postponed'],
        default: 'Scheduled'
    },
    scoringMethod: {
        type: String,
        enum: ['Runs/Overs', 'Goals', 'Sets/Points', 'Points', 'Board_Points'],
        default: 'Points'
    },
    detailScore: mongoose.Schema.Types.Mixed,
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

const Match = mongoose.models.Match || mongoose.model('Match', matchSchema);
export default Match;
