import mongoose from 'mongoose';

const aiChatSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        default: 'New Chat'
    },
    status: {
        type: String,
        enum: ['Active', 'Archived'],
        default: 'Active'
    }
}, { timestamps: true });

const AIChatSession = mongoose.models.AIChatSession || mongoose.model('AIChatSession', aiChatSessionSchema);
export default AIChatSession;
