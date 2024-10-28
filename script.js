document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const userInput = document.getElementById('user-input').value;
    const imageInput = document.getElementById('image-input').files[0];

    if (!userInput && !imageInput) return;

    if (userInput) displayMessage(userInput, 'user');

    const formData = new FormData();
    formData.append('message', userInput);
    if (imageInput) {
        displayMessage("Uploading image...", 'user');
        formData.append('image', imageInput);
    }

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        // Check if data.choices exists and has a response
        if (data.choices && data.choices.length > 0) {
            const botMessage = data.choices[0].message.content;
            displayMessage(botMessage, 'bot');
        } else {
            displayMessage("The art critic couldn't respond. Please try again.", 'bot');
        }
    } catch (error) {
        console.error('Error:', error);
        displayMessage("The art critic is silent... Please try again.", 'bot');
    }

    document.getElementById('user-input').value = '';
    document.getElementById('image-input').value = '';
}

function displayMessage(message, sender) {
    const chatBox = document.getElementById('chat-box');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.innerText = message;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}