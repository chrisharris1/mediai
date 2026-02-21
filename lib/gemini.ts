import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Safety settings - allowing medical discussions while blocking harmful content
const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
];

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

// Get the Gemini model configured for chat
export function getGeminiModel() {
    return genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        safetySettings,
        generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 2048,
        },
    });
}

// Create a chat session with history
export async function createChatSession(history: { role: string; parts: { text: string }[] }[] = []) {
    const model = getGeminiModel();

    // Start chat with system context
    const chat = model.startChat({
        history: [
            {
                role: 'user',
                parts: [{ text: 'System context: ' + MEDICAL_SYSTEM_PROMPT }],
            },
            {
                role: 'model',
                parts: [{ text: 'I understand. I am MediAI Health Assistant, ready to help users with their health-related questions while being empathetic, professional, and always recommending professional medical consultation. I will use the action keywords when appropriate and format my responses clearly. How can I help you today? 😊' }],
            },
            ...history,
        ],
    });

    return chat;
}

// Generate a response for a single message
export async function generateChatResponse(message: string, history: { role: string; parts: { text: string }[] }[] = [], userContext?: string) {
    const chat = await createChatSession(history);

    // Add user context if available
    let fullMessage = message;
    if (userContext) {
        fullMessage = `[User Context: ${userContext}]\n\nUser Message: ${message}`;
    }

    const result = await chat.sendMessage(fullMessage);
    const response = await result.response;

    return response.text();
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

export default genAI;
