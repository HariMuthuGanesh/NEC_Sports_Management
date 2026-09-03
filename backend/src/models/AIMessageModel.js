import mongoose from 'mongoose';

const aiMessageSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AIChatSession',
        required: true,
        index: true
    },
    sender: {
        type: String,
        enum: ['USER', 'AI'],
        required: true
    },
    content: {
        type: String,
        required: true
    }
}, { timestamps: true });

const AIMessage = mongoose.models.AIMessage || mongoose.model('AIMessage', aiMessageSchema);
export default AIMessage;
