function showChat() {
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('chatpage').style.display = 'block';
}

function showHome() {
    document.getElementById('chatpage').style.display = 'none';
    document.getElementById('homepage').style.display = 'block';
}
// Trigger the hidden file input when the "+" button is clicked
document.getElementById('file-upload-btn').addEventListener('click', () => {
    document.getElementById('image-input').click();
});

// Display the selected image in the chatbox immediately
document.getElementById('image-input').addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            displayMessage(`<img src="${e.target.result}" alt="Uploaded Image">`, 'user', true);
        };
        reader.readAsDataURL(file);
    }
});

// Function to send a message with the image, if available
async function sendMessage() {
    const userInput = document.getElementById('user-input').value;
    const imageInput = document.getElementById('image-input').files[0];

    if (!userInput && !imageInput) return; // Prevent empty submissions

    // Display the user's text input in the chat
    if (userInput) displayMessage(userInput, 'user');

    // Reset input fields
    document.getElementById('user-input').value = '';
    document.getElementById('image-input').value = '';

    // Show image in chatbox if uploaded
    if (imageInput) {
        const reader = new FileReader();
        reader.onload = function (e) {
            displayMessage(`<img src="${e.target.result}" alt="Uploaded Image">`, 'user', true);
        };
        reader.readAsDataURL(imageInput);
    }

    // Prepare form data for sending text and image together
    const formData = new FormData();
    formData.append('message', userInput);
    if (imageInput) formData.append('image', imageInput);

    // Send data to backend
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        // Display AI response if it exists
        if (data && data.choices && data.choices[0] && data.choices[0].message.content) {
            displayMessage(data.choices[0].message.content, 'bot');
        } else {
            displayMessage("The AI is thinking... Please try again.", 'bot');
        }
    } catch (error) {
        console.error("Error:", error);
        displayMessage("An error occurred. Please try again.", 'bot');
    }
}

// Modified displayMessage function to handle HTML content
function displayMessage(content, sender, isHtml = false) {
    const chatBox = document.getElementById('chat-box');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    
    if (isHtml) {
        messageElement.innerHTML = content; // Allows HTML for image display
    } else {
        messageElement.innerText = content;
    }

    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Event listeners for sending messages
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});