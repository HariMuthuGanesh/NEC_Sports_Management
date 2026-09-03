import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
        index: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['Captain', 'Vice Captain', 'Player', 'Goalkeeper', 'Reserve'],
        default: 'Player'
    },
    joinDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Ensure a student can only be added to a team once
teamMemberSchema.index({ teamId: 1, studentId: 1 }, { unique: true });

const TeamMember = mongoose.models.TeamMember || mongoose.model('TeamMember', teamMemberSchema);
export default TeamMember;
