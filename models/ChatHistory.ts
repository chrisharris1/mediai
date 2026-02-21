import mongoose, { Schema, Document, CallbackWithoutResultAndOptionalError } from 'mongoose';

export interface IChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    actions?: string[]; // Actions triggered by this message
}

export interface IChatHistory extends Document {
    user_id: mongoose.Types.ObjectId;
    messages: IChatMessage[];
    created_at: Date;
    updated_at: Date;
}

const ChatMessageSchema = new Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    actions: [{
        type: String,
    }],
});

const ChatHistorySchema: Schema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, // One chat history per user
        index: true,
    },
    messages: {
        type: [ChatMessageSchema],
        default: [],
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
});

// Limit message history to last 100 messages to prevent memory issues
ChatHistorySchema.pre('save', function (this: IChatHistory) {
    if (this.messages && this.messages.length > 100) {
        this.messages = this.messages.slice(-100);
    }
    this.updated_at = new Date();
});

export default mongoose.models.ChatHistory || mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);
