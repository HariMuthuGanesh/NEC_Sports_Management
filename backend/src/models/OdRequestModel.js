import mongoose from 'mongoose';

const odRequestSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId, // Will link to Tournament model once created
        required: true
    },
    fromDate: {
        type: Date,
        required: true
    },
    toDate: {
        type: Date,
        required: true
    },
    totalDays: {
        type: Number,
        required: true
    },
    approvalStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    remarks: {
        type: String
    }
}, { timestamps: true });

const OdRequest = mongoose.models.OdRequest || mongoose.model('OdRequest', odRequestSchema);
export default OdRequest;
