document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const userInput = document.getElementById('user-input').value;
    if (!userInput) return;

    displayMessage(userInput, 'user');

    const artCriticPrompt = `You are an insightful and knowledgeable art critic. Offer a thoughtful response about art, discussing artistic techniques, historical context, or detailed critique. The user has asked: "${userInput}"`;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: artCriticPrompt })
        });

        const data = await response.json();
        const botMessage = data.choices[0].message.content;
        displayMessage(botMessage, 'bot');
    } catch (error) {
        displayMessage("The art critic is silent... Please try again.", 'bot');
    }

    document.getElementById('user-input').value = '';
}

function displayMessage(message, sender) {
    const chatBox = document.getElementById('chat-box');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.innerText = message;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}