// chat-widget-custom.js - Corrected for DOM Loading Order

(function() {
    console.log("MyChatWidget: Script loading started.");

    // --- Configuration ---
    const defaultConfig = {
        webhook: {
            url: '', // Must be provided by user config
        },
        branding: {
            logo: '',
            name: 'Chat Support',
            welcomeText: 'Hello!',
        },
        style: {
            primaryColor: '#1a73e8',
            secondaryColor: '#4285f4',
            position: 'right', // 'right' or 'left'
            backgroundColor: '#ffffff',
            fontColor: '#333333'
        }
    };

    const userConfig = window.MyChatWidgetConfig || {};
    const config = {
        webhook: { ...defaultConfig.webhook, ...userConfig.webhook },
        branding: { ...defaultConfig.branding, ...userConfig.branding },
        style: { ...defaultConfig.style, ...userConfig.style }
    };

    console.log("MyChatWidget: Configuration loaded.", config);

    // Validate webhook URL is provided
    if (!config.webhook.url || typeof config.webhook.url !== 'string') {
        console.error("MyChatWidget: Webhook URL is not configured or is invalid. Please set window.MyChatWidgetConfig.webhook.url = 'YOUR_N8N_WEBHOOK_URL_HERE';");
         const errorDiv = document.createElement('div');
         errorDiv.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: red; color: white; padding: 10px; z-index: 1001; font-family: sans-serif;';
         errorDiv.textContent = 'Chat Widget Error: Webhook URL not set!';
         document.body.appendChild(errorDiv);
        console.log("MyChatWidget: Initialization stopped due to missing webhook URL.");
        return; // Stop initialization if no valid webhook URL
    }
     console.log(`MyChatWidget: Webhook URL set to: ${config.webhook.url}`);


    // Prevent multiple initializations
    if (window.MyChatWidgetInitialized) {
        console.log("MyChatWidget: Already initialized. Stopping.");
        return;
    }
    // Use the previous widget's identifier too, just in case
    if (window.N8NChatWidgetInitialized) {
         console.warn("MyChatWidget: Found existing N8NChatWidgetInitialized flag. This might indicate a conflict.");
    }
    window.N8NChatWidgetInitialized = true;
    window.MyChatWidgetInitialized = true;
    console.log("MyChatWidget: Initialization started.");


    let currentSessionId = localStorage.getItem('myChatSessionId') || null;
    console.log(`MyChatWidget: Initial session ID from local storage: ${currentSessionId}`);

    // --- Helper Function to Generate UUID ---
    function generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // --- Helper Function to Start New Session ---
    // Needs references to DOM elements, so defined here but called later
    let chatContainer, messagesContainer, chatInterface; // Define variables in outer scope

    function startNewSession() {
        console.log("MyChatWidget: 'Start New Chat' button clicked. Starting new session.");
        currentSessionId = generateUUID();
        localStorage.setItem('myChatSessionId', currentSessionId); // Save session ID
        console.log(`MyChatWidget: New session ID generated and saved: ${currentSessionId}`);

        messagesContainer.innerHTML = ''; // Clear message area

        // Send the 'startSession' action to the backend
        console.log("MyChatWidget: Calling sendMessageToBackend with action: 'startSession'");
        // The backend should respond with the first message, which sendMessageToBackend will display
        sendMessageToBackend({ action: 'startSession' });

        // Transition UI
        const newConversationScreen = chatContainer.querySelector('.new-conversation');
        if (newConversationScreen) newConversationScreen.style.display = 'none';
        chatInterface.classList.add('active');
        console.log("MyChatWidget: UI switched to chat interface.");
    }

    // Helper function to add messages to UI (can be expanded later)
    // Needs reference to messagesContainer
    window.addMessage = function(text, sender) {
        if (!messagesContainer) {
             console.error("MyChatWidget: messagesContainer not found. Cannot add message.");
             return;
        }
        console.log(`MyChatWidget: Adding message to UI (Sender: ${sender}): "${text}"`);
        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message-bubble', sender); // 'user' or 'bot'
        messageBubble.textContent = text;
         // Future: check for button data here and call addRichContentMessage

        messagesContainer.appendChild(messageBubble);
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Auto-scroll
    };

    // Helper function to add rich content (like buttons) - To be implemented in Section IV
    // window.addRichContentMessage = function(messageData, sender) { /* ... */ };
    // Add this function below window.addMessage in your IIFE
    window.addRichContentMessage = function(responseData, sender) {
        if (!messagesContainer) {
            console.error("MyChatWidget: messagesContainer not found. Cannot add rich content message.");
            return;
        }
        console.log("MyChatWidget: Adding rich content message with buttons.");

        // Create message bubble container
        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message-bubble', sender);

        // If there is a text output, add it first:
        if (responseData.output) {
            const textElem = document.createElement('div');
            textElem.textContent = responseData.output;
            messageBubble.appendChild(textElem);
        }

        // Create a container for buttons
        if (responseData.buttons && Array.isArray(responseData.buttons)) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'button-container';

            responseData.buttons.forEach(function(buttonData) {
                const btn = document.createElement('button');
                btn.classList.add('message-button');
                btn.textContent = buttonData.label;
                // When the button is clicked, send its payload to the backend
                btn.addEventListener('click', function() {
                    console.log(`MyChatWidget: Language button "${buttonData.label}" clicked.`);
                    sendMessageToBackend({ action: 'languageSelect', language: buttonData.payload });
                    // Optionally disable buttons after selection
                    [...buttonContainer.children].forEach(b => b.disabled = true);
                });
                buttonContainer.appendChild(btn);
            });
            messageBubble.appendChild(buttonContainer);
        }

        messagesContainer.appendChild(messageBubble);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    // --- Helper function to Send Messages to Backend ---
    // Needs reference to currentSessionId and config
    async function sendMessageToBackend(messagePayload) {
         if (!currentSessionId) {
              console.error("MyChatWidget: Cannot send message to backend, session ID is null.");
              window.addMessage("Error: Chat session not started.", 'bot');
              return;
         }
         if (!config.webhook.url) {
              console.error("MyChatWidget: Cannot send message to backend, webhook URL is not set.");
               window.addMessage("Error: Chat server URL not configured.", 'bot');
              return;
         }


        console.log("MyChatWidget: Preparing data to send to backend.");
        const dataToSend = {
            sessionId: currentSessionId,
            ...messagePayload
        };
        console.log("MyChatWidget: Sending to webhook URL:", config.webhook.url);
        console.log("MyChatWidget: Sending data:", dataToSend);


        // Add a typing indicator? (Optional enhancement)
        // console.log("MyChatWidget: Showing typing indicator (if implemented).");

        try {
            console.log("MyChatWidget: Initiating fetch request...");
            const response = await fetch(config.webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            });
            console.log(`MyChatWidget: Fetch request finished. Response status: ${response.status}`);

            if (!response.ok) {
                 console.error(`MyChatWidget: Webhook returned non-OK status: ${response.status} ${response.statusText}`);
                 const errorText = await response.text();
                 console.error("MyChatWidget: Webhook Error Response Body:", errorText);
                 window.addMessage(`Error from server: ${response.status}. Check console for details.`, 'bot');
                 return;
            }

            console.log("MyChatWidget: Webhook response is OK. Parsing JSON.");
            const responseData = await response.json();
            console.log("MyChatWidget: Received JSON response data:", responseData);

            // Assuming n8n responds with { "output": "Your bot message" } for now
            // This will be expanded in Section IV to handle different response types
            if (responseData) {
                if (responseData.buttons && Array.isArray(responseData.buttons)) {
                    // Render rich content with buttons
                    window.addRichContentMessage(responseData, 'bot');
                } else if (typeof responseData.output === 'string') {
                    console.log("MyChatWidget: Found 'output' string in response. Adding bot message.");
                    window.addMessage(responseData.output, 'bot');
                } else {
                    console.warn("MyChatWidget: Response format not recognized.", responseData);
                }
            }


        } catch (error) {
            console.error('MyChatWidget: Error during fetch or response processing:', error);
            if (error instanceof TypeError) {
                 window.addMessage("Network error: Could not connect to the chat server. Check console.", 'bot');
            } else {
                 window.addMessage("An error occurred while processing the response. Check console.", 'bot');
            }

        } finally {
            // Remove typing indicator? (Optional enhancement)
        }
    }

    

    // --- CSS Styles (Corrected typo) ---
     const styles = `
        .my-chat-widget {
            /* CSS Variables for easy color customization */
            --chat-primary-color: ${config.style.primaryColor};
            --chat-secondary-color: ${config.style.secondaryColor}; /* CORRECTED TYPO */
            --chat-background-color: ${config.style.backgroundColor};
            --chat-font-color: ${config.style.fontColor};

            font-family: sans-serif; /* Use a common fallback */
            line-height: 1.5;
            -webkit-font-smoothing: antialiased; /* Improve text rendering */
            -moz-osx-font-smoothing: grayscale;
        }

        .my-chat-widget * {
            box-sizing: border-box; /* Include padding and border in element's total width and height */
        }

        .my-chat-widget .chat-container {
            position: fixed;
            bottom: 20px;
            /* Default to right, overridden by position-left */
            right: 20px;
            z-index: 1000;
            display: none; /* Hidden by default */
            width: 350px; /* Adjust size as needed */
            height: 500px; /* Adjust size as needed */
            background: var(--chat-background-color);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            overflow: hidden;
            flex-direction: column; /* Use flexbox for internal layout */
        }

        .my-chat-widget .chat-container.position-left {
            right: auto; /* Remove right positioning */
            left: 20px;  /* Position on the left */
        }

        .my-chat-widget .chat-container.open {
            display: flex; /* Show when 'open' class is added */
        }

        .my-chat-widget .chat-header {
            padding: 12px 16px;
            background: linear-gradient(135deg, var(--chat-primary-color) 0%, var(--chat-secondary-color) 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0; /* Don't shrink */
        }

        .my-chat-widget .header-brand {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .my-chat-widget .header-brand img {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            object-fit: cover; /* Ensure image covers area */
        }

        .my-chat-widget .header-brand span {
            font-size: 16px;
            font-weight: bold;
            color: white; /* Header text is white */
        }

        .my-chat-widget .close-button {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 20px;
            line-height: 1;
            padding: 4px;
            opacity: 0.8;
            transition: opacity 0.2s;
        }

        .my-chat-widget .close-button:hover {
            opacity: 1;
        }

         /* Welcome/New Conversation Screen */
        .my-chat-widget .new-conversation {
            flex-grow: 1; /* Take up remaining space */
            display: flex; /* Use flex for centering content */
            flex-direction: column;
            justify-content: center; /* Center vertically */
            align-items: center; /* Center horizontally */
            padding: 20px;
            text-align: center;
            background: var(--chat-background-color);
        }

        .my-chat-widget .welcome-text {
            font-size: 1.5em; /* Relative sizing */
            font-weight: 600;
            color: var(--chat-font-color);
            margin-bottom: 25px; /* More space before button */
            line-height: 1.3;
        }

         .my-chat-widget .start-chat-button {
            display: inline-flex; /* Use inline-flex for centering within parent */
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 25px; /* Increased padding */
            background: linear-gradient(135deg, var(--chat-primary-color) 0%, var(--chat-secondary-color) 100%);
            color: white;
            border: none;
            border-radius: 25px; /* Pill shape */
            cursor: pointer;
            font-size: 1em;
            font-weight: 500;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            font-family: inherit;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .my-chat-widget .start-chat-button:hover {
            transform: translateY(-2px); /* Slight lift effect */
            box-shadow: 0 6px 12px rgba(0,0,0,0.15);
        }


        .my-chat-widget .chat-interface {
            display: flex; /* Hidden by default */
            flex-direction: column;
            flex-grow: 1;
            /* Initial messages go here if needed before input area */
        }

         .my-chat-widget .chat-interface:not(.active) {
             display: none; /* Hide if not active */
         }


         .my-chat-widget .chat-messages {
            flex-grow: 1;
            overflow-y: auto;
            padding: 15px;
            display: flex;
            flex-direction: column;
            min-height: 0; /* Allow the element to shrink */
        }
        

         .my-chat-widget .chat-messages::-webkit-scrollbar {
            width: 8px;
         }
         .my-chat-widget .chat-messages::-webkit-scrollbar-track {
            background: transparent;
         }
         .my-chat-widget .chat-messages::-webkit-scrollbar-thumb {
            background-color: var(--chat-secondary-color);
            border-radius: 20px;
            border: 2px solid var(--chat-background-color);
         }


        .my-chat-widget .message-bubble {
            margin: 5px 0; /* Reduced margin */
            padding: 10px 14px;
            border-radius: 15px;
            max-width: 85%; /* Increased max-width slightly */
            word-wrap: break-word;
            font-size: 14px;
            white-space: pre-wrap; /* Respect new lines */
        }

        .my-chat-widget .message-bubble.user {
            align-self: flex-end;
            background: var(--chat-primary-color);
            color: white;
            border-bottom-right-radius: 2px;
        }

        .my-chat-widget .message-bubble.bot {
            align-self: flex-start;
            background: #e9e9eb; /* Light grey for bot messages */
            color: var(--chat-font-color);
            border-bottom-left-radius: 2px;
        }

         /* Styling for buttons *within* a bot message (will be added later) */
         .my-chat-widget .message-bubble.bot .button-container {
             margin-top: 10px;
             display: flex;
             flex-direction: column;
             gap: 8px;
         }
          .my-chat-widget .message-bubble.bot .message-button {
             background: rgba(0,0,0,0.05); /* Subtle button background */
             color: var(--chat-font-color);
             border: 1px solid rgba(0,0,0,0.1);
             border-radius: 5px;
             padding: 8px 12px;
             cursor: pointer;
             text-align: center;
             font-size: 13px;
             transition: background 0.2s ease;
          }
          .my-chat-widget .message-bubble.bot .message-button:hover {
              background: rgba(0,0,0,0.1);
          }


        .my-chat-widget .chat-input-area {
            flex-shrink: 0; /* Don't shrink */
            padding: 10px 15px;
            border-top: 1px solid #eee;
            display: flex;
            gap: 10px;
            align-items: center;
            background: var(--chat-background-color);
        }

        .my-chat-widget .chat-input-area textarea {
            flex-grow: 1; /* Take up space */
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 20px; /* Rounded input */
            resize: none; /* Prevent manual resizing */
            font-size: 14px;
            max-height: 80px; /* Limit input height */
            overflow-y: auto; /* Scroll if text exceeds height */
            font-family: inherit;
            color: var(--chat-font-color);
            background: var(--chat-background-color);
        }
         .my-chat-widget .chat-input-area textarea::placeholder {
            color: var(--chat-font-color);
            opacity: 0.6;
         }


        .my-chat-widget .send-button {
            background: var(--chat-primary-color);
            color: white;
            border: none;
            border-radius: 20px; /* Rounded button */
            padding: 10px 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: background 0.2s ease;
            flex-shrink: 0; /* Don't shrink */
             font-family: inherit;
        }

        .my-chat-widget .send-button:hover {
            background: var(--chat-secondary-color);
        }

        .my-chat-widget .chat-toggle-button {
            position: fixed;
            bottom: 20px;
            /* Default to right */
            right: 20px;
            z-index: 999;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--chat-primary-color) 0%, var(--chat-secondary-color) 100%);
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease;
        }
         .my-chat-widget .chat-toggle-button.position-left {
            right: auto;
            left: 20px;
         }

        .my-chat-widget .chat-toggle-button:hover {
            transform: scale(1.05);
        }

        .my-chat-widget .chat-toggle-button svg {
             width: 24px;
             height: 24px;
             fill: currentColor; /* Use button color */
        }

    `;


    // --- HTML Structure ---
    const widgetHTML = `
        <div class="chat-container${config.style.position === 'left' ? ' position-left' : ''}">
            <div class="chat-header">
                <div class="header-brand">
                    ${config.branding.logo ? `<img src="${config.branding.logo}" alt="${config.branding.name} Logo">` : ''}
                    <span>${config.branding.name}</span>
                </div>
                <button class="close-button">×</button>
            </div>

            <div class="new-conversation">
                <h2 class="welcome-text">${config.branding.welcomeText}</h2>
                 <button class="start-chat-button">
                    <svg style="width:24px;height:24px" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H5.2L4 17.2V4h16v12Z" />
                    </svg>
                    Start New Chat
                </button>
            </div>

            <div class="chat-interface">
                 <!-- Messages will be added here by JS -->
                <div class="chat-messages"></div>
                <div class="chat-input-area">
                    <textarea placeholder="Type your message..." rows="1"></textarea>
                    <button class="send-button">Send</button>
                </div>
            </div>
        </div>
        <button class="chat-toggle-button${config.style.position === 'left' ? ' position-left' : ''}">
             <!-- Basic message icon SVG -->
             <svg viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2.5 21.5l4.5-.838A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.476 0-2.886-.313-4.156-.878l-3.156.586.586-3.156A7.962 7.962 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
             </svg>
        </button>
    `;

    // --- Injection and DOM Manipulation ---
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    console.log("MyChatWidget: Stylesheet injected.");

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'my-chat-widget';
    // IMPORTANT: Set innerHTML *before* appending to body or getting references
    widgetContainer.innerHTML = widgetHTML;
    document.body.appendChild(widgetContainer);
    console.log("MyChatWidget: Widget container HTML injected into body.");


    // --- Get References to Elements ---
    // NOW it's safe to get these references because the HTML is in the DOM
    chatContainer = widgetContainer.querySelector('.chat-container');
    const toggleButton = widgetContainer.querySelector('.chat-toggle-button');
    const closeButton = chatContainer.querySelector('.close-button');
    const startChatButton = chatContainer.querySelector('.start-chat-button');
    messagesContainer = chatContainer.querySelector('.chat-messages');
    const textarea = chatContainer.querySelector('textarea');
    const sendButton = chatContainer.querySelector('.send-button');
    chatInterface = chatContainer.querySelector('.chat-interface'); // Reference to the interface container

    console.log("MyChatWidget: DOM elements referenced.");

    // --- Event Listeners ---
    console.log("MyChatWidget: Adding event listeners.");

    // Toggle button click
    toggleButton.addEventListener('click', () => {
        console.log("MyChatWidget: Toggle button clicked.");
        const isOpening = !chatContainer.classList.contains('open');
        chatContainer.classList.toggle('open');

         if (isOpening) {
             console.log("MyChatWidget: Chat window opening.");
             messagesContainer.scrollTop = messagesContainer.scrollHeight;

             if (currentSessionId) {
                 console.log("MyChatWidget: Session ID exists. Showing chat interface.");
                 const newConversationScreen = chatContainer.querySelector('.new-conversation');
                 if (newConversationScreen) newConversationScreen.style.display = 'none';
                 chatInterface.classList.add('active');
                 // Consider loading history here if implemented
                 // sendMessageToBackend({ action: 'loadHistory', sessionId: currentSessionId });
             } else {
                 console.log("MyChatWidget: No session ID found. Showing new conversation screen.");
                 const newConversationScreen = chatContainer.querySelector('.new-conversation');
                 if (newConversationScreen) newConversationScreen.style.display = 'flex';
                 chatInterface.classList.remove('active');
             }
         } else {
             console.log("MyChatWidget: Chat window closing.");
         }
    });

    // Close button click
    closeButton.addEventListener('click', () => {
        console.log("MyChatWidget: Close button clicked.");
        chatContainer.classList.remove('open');
    });

    // Start Chat button click
    startChatButton.addEventListener('click', startNewSession);
    console.log("MyChatWidget: 'Start New Chat' button listener added.");


    // Send message button click
    sendButton.addEventListener('click', () => {
        console.log("MyChatWidget: Send button clicked.");
        const message = textarea.value.trim();
        if (message && currentSessionId) {
            console.log(`MyChatWidget: User message detected: "${message}". Session ID exists. Sending.`);
            window.addMessage(message, 'user');
            sendMessageToBackend({ action: 'sendMessage', text: message });
            textarea.value = '';
            textarea.style.height = 'auto';
        } else if (!message) {
             console.log("MyChatWidget: Send button clicked, but message was empty.");
        }
        else if (!currentSessionId) {
             console.warn("MyChatWidget: Send button clicked, but no session ID found. User must click 'Start New Chat' first.");
        }
    });
    console.log("MyChatWidget: Send button listener added.");


    // Send message on Enter key (in textarea)
    textarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            console.log("MyChatWidget: Enter key pressed in textarea (not Shift+Enter).");
            e.preventDefault();
            sendButton.click();
        }
    });
    console.log("MyChatWidget: Textarea keypress listener added.");


     // Auto-resize textarea based on content
     textarea.addEventListener('input', () => {
         textarea.style.height = 'auto';
         textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
     });
    console.log("MyChatWidget: Textarea input listener added.");


    // --- Initial Load Logic ---
    console.log("MyChatWidget: Checking initial state on script load.");
     // Check if the chat window is already open on page load (unlikely)
     if (chatContainer && chatContainer.classList.contains('open') && currentSessionId) {
         console.log("MyChatWidget: Chat container open and session exists on load. Showing chat interface.");
         const newConversationScreen = chatContainer.querySelector('.new-conversation');
         if (newConversationScreen) newConversationScreen.style.display = 'none';
         chatInterface.classList.add('active');
     } else if (chatContainer && chatContainer.classList.contains('open') && !currentSessionId) {
          console.log("MyChatWidget: Chat container open on load but no session. Showing new conversation screen.");
           const newConversationScreen = chatContainer.querySelector('.new-conversation');
           if (newConversationScreen) newConversationScreen.style.display = 'flex';
           chatInterface.classList.remove('active');
     } else {
         console.log("MyChatWidget: Chat container not open on load.");
     }

    console.log("MyChatWidget: Script loading finished.");

})();