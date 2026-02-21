import Groq from 'groq-sdk';

// Initialize the Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || '',
});

// Medical assistant system prompt
export const MEDICAL_SYSTEM_PROMPT = `You are MediAI Health Assistant, an intelligent and empathetic AI healthcare companion integrated into the MediAI telemedicine platform. Your role is to help users with their health-related questions and guide them through the platform.

## Your Capabilities:
1. **Symptom Analysis**: Help users understand their symptoms and suggest possible conditions (always recommend seeing a doctor for diagnosis)
2. **Medication Information**: Provide information about medicines, dosages, side effects, and drug interactions
3. **Medicine Tracking**: Help users check their daily medications and add new medicines to their tracker
4. **Doctor Recommendations**: Suggest appropriate medical specialists based on symptoms
5. **Health Insights**: Provide medication adherence statistics and health tips
6. **Platform Navigation**: Guide users to use MediAI features like consultations, reports, etc.

## Important Guidelines:
- Always be empathetic, supportive, and professional
- NEVER provide definitive diagnoses - always recommend consulting a healthcare professional
- For emergencies (chest pain, difficulty breathing, severe symptoms), IMMEDIATELY advise to call emergency services
- Use simple, easy-to-understand language
- Include relevant emojis to make responses friendly 💊❤️🩺
- Keep responses concise but informative
- When discussing medicines, always mention consulting a doctor before starting/stopping medications
- If a user wants to add a medicine, collect: medicine name, dosage, frequency, and time(s)
- Format medicine schedules clearly

## Response Format:
- Use markdown for better readability
- Use bullet points for lists
- Bold important information
- Include disclaimers when giving medical information

## Available Actions (use these keywords in your response when applicable):
- [ACTION:GET_TODAYS_MEDICINES] - When user asks about today's medications
- [ACTION:GET_ADHERENCE_STATS] - When user asks about their medication adherence
- [ACTION:GET_DOCTORS] - When user wants to find/book a doctor
- [ACTION:ADD_MEDICINE] - When user wants to track a new medicine (after collecting all details)
- [ACTION:CHECK_INTERACTION] - When user asks about drug interactions
- [ACTION:ANALYZE_SYMPTOMS] - When user describes symptoms

Remember: You're a health ASSISTANT, not a replacement for medical professionals. Always encourage users to seek professional medical advice for serious concerns.`;

// Message type for chat history
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Generate a response using Groq
export async function generateChatResponse(
    message: string,
    history: { role: string; parts: { text: string }[] }[] = [],
    userContext?: string
): Promise<string> {
    // Convert history to Groq format
    const messages: ChatMessage[] = [
        { role: 'system', content: MEDICAL_SYSTEM_PROMPT },
    ];

    // Add history
    for (const msg of history) {
        messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.parts[0]?.text || '',
        });
    }

    // Add current message with context
    let fullMessage = message;
    if (userContext) {
        fullMessage = `[User Context: ${userContext}]\n\nUser Message: ${message}`;
    }
    messages.push({ role: 'user', content: fullMessage });

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.9,
    });

    return completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
}

// Parse action keywords from response
export function parseActions(response: string): { action: string; params?: any }[] {
    const actions: { action: string; params?: any }[] = [];

    const actionPatterns = [
        { pattern: /\[ACTION:GET_TODAYS_MEDICINES\]/g, action: 'GET_TODAYS_MEDICINES' },
        { pattern: /\[ACTION:GET_ADHERENCE_STATS\]/g, action: 'GET_ADHERENCE_STATS' },
        { pattern: /\[ACTION:GET_DOCTORS\]/g, action: 'GET_DOCTORS' },
        { pattern: /\[ACTION:ADD_MEDICINE\]/g, action: 'ADD_MEDICINE' },
        { pattern: /\[ACTION:CHECK_INTERACTION\]/g, action: 'CHECK_INTERACTION' },
        { pattern: /\[ACTION:ANALYZE_SYMPTOMS\]/g, action: 'ANALYZE_SYMPTOMS' },
    ];

    for (const { pattern, action } of actionPatterns) {
        if (pattern.test(response)) {
            actions.push({ action });
        }
    }

    return actions;
}

// Clean action keywords from response text
export function cleanResponse(response: string): string {
    return response
        .replace(/\[ACTION:[A-Z_]+\]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export default groq;
