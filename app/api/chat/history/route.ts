import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { dbConnect } from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';

// GET /api/chat/history - Get user's chat history
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const chatHistory = await ChatHistory.findOne({ user_id: session.user.id });

        if (!chatHistory) {
            return NextResponse.json({
                success: true,
                messages: [],
                total: 0
            });
        }

        // Return last 50 messages by default
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        const messages = chatHistory.messages.slice(-limit);

        return NextResponse.json({
            success: true,
            messages,
            total: chatHistory.messages.length,
        });

    } catch (error: any) {
        console.error('Error fetching chat history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chat history' },
            { status: 500 }
        );
    }
}

// DELETE /api/chat/history - Clear chat history
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const result = await ChatHistory.findOneAndUpdate(
            { user_id: session.user.id },
            { messages: [], updated_at: new Date() }
        );

        return NextResponse.json({
            success: true,
            message: 'Chat history cleared',
        });

    } catch (error: any) {
        console.error('Error clearing chat history:', error);
        return NextResponse.json(
            { error: 'Failed to clear chat history' },
            { status: 500 }
        );
    }
}
