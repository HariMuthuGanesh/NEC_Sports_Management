import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Team name is required'],
        trim: true
    },
    teamType: {
        type: String,
        enum: ['Inter-Department', 'Outer-College'],
        default: 'Inter-Department'
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        index: true
    },
    sportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sport',
        required: true,
        index: true
    },
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        index: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        index: true
    },
    captainStudentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    coachName: String,
    jerseyColor: String,
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Disqualified'],
        default: 'Pending'
    }
}, { timestamps: true });

const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);
export default Team;
