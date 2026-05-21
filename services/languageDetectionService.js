const detectLanguage = async (title, description) => {
    const text = `${title}\n ${description}`.trim();

    // Default to Finnish if text is too short or empty
    if (text.length < 10) {
        return 'fi';
    }

    if (!process.env.OPENAI_API_KEY) {
        return 'fi';
    }

    try {
        const response = await fetch(
            'https://ohtu-openai-services.openai.azure.com/openai/deployments/gpt-5.4-mini/chat/completions?api-version=2025-01-01-preview',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-5.4-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a language detection assistant. Respond only with the ISO 639-1 language code (e.g., "fi", "en", "sv") of the provided text. If you are less than 80% confident, respond "fi".'
                        },
                        {
                            role: 'user',
                            content: text
                        }
                    ]
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const detected = data.choices[0].message.content.trim().toLowerCase();

        // Return detected language code, or 'fi' if AI returned something unexpected
        return detected.length <= 3 ? detected : 'fi';
    } catch (error) {
        console.error('Error detecting language with OpenAI:', error.message);
        return 'fi';
    }
};

module.exports = {
    detectLanguage
};
