import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Team name is required'],
        trim: true
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true,
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
        required: true,
        index: true
    },
    captainStudentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
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
