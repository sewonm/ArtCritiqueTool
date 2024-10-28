document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const userInput = document.getElementById('user-input').value;
    const imageInput = document.getElementById('image-input').files[0];

    if (!userInput && !imageInput) return; // Do nothing if no text or image is provided

    // Display the user’s text input if provided
    if (userInput) displayMessage(userInput, 'user');

    // Prepare form data for sending text and image together
    const formData = new FormData();
    formData.append('message', userInput);
    if (imageInput) {
        displayMessage("Uploading image...", 'user');
        formData.append('image', imageInput);
    }

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            body: formData // Send FormData directly
        });

        const data = await response.json();
        const botMessage = data.choices[0].message.content;
        displayMessage(botMessage, 'bot');
    } catch (error) {
        console.error('Error:', error);
        displayMessage("The art critic is silent... Please try again.", 'bot');
    }

    // Clear input fields
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