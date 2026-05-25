const axios = require('axios');

const generateChapters = async (vttContent, language) => {
    if (!vttContent || vttContent.length < 50) {
        return null;
    }

    if (!process.env.OPENAI_API_KEY) {
        return null;
    }

    try {
        const languagePrompt = language ? ` Generate the chapters in ${language}.` : '';
        const response = await axios.post(
            'https://ohtu-openai-services.openai.azure.com/openai/deployments/gpt-5.4-mini/chat/completions?api-version=2025-01-01-preview',
            {
                model: 'gpt-5.4-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a video chapter generator. Based on the provided WebVTT transcript, identify key sections and generate chapter markers in WebVTT format suitable for JWPlayer.${languagePrompt}`
                    },
                    {
                        role: 'user',
                        content: `Please generate chapters for this video based on the following transcript. Use the WebVTT format exactly as shown in the example below.\n\nExample Output Format:\nWEBVTT Chapter 1\n00:00:00.000 --> 00:01:42.000\nOpening credits\n\nChapter 2\n00:01:42.000 --> 00:04:44.000\nA dangerous quest\n\nTranscript:\n${vttContent}`
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const chapters = response.data.choices[0].message.content.trim();

        return chapters.includes('WEBVTT') ? chapters : null;
    } catch (error) {
        console.error('Error generating chapters with OpenAI:', error.message);
        return null;
    }
};

module.exports = {
    generateChapters
};
