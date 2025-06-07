# Custom Chat Widget for n8n Backend

A simple, custom-built chat widget frontend designed to interface with an n8n workflow acting as the chatbot's backend logic.

This project demonstrates the separation of concerns: the frontend handles the user interface and communication, while the backend (n8n) manages the complex conversation flow and integrations.

## Project Structure
Use code with caution.
Markdown
/your-repo-name
├── .gitignore
├── README.md
├── index.html # Demo page with configuration
├── js/
│ └── chat-widget-custom.js # The custom widget script
└── img/
└── logo.jpg # Placeholder for your logo

## Features (Implemented)

*   Basic chat widget UI (toggle button, chat window, header, message area, input).
*   Configurable appearance (colors, position, branding).
*   Client-side session management using Local Storage.
*   Sending user text messages to a configurable n8n webhook (POST, JSON).
*   Receiving basic text responses from the n8n webhook (`{ "output": "..." }`).
*   Displaying received bot messages.
*   "Start New Chat" button to initiate a session via a specific backend action (`action: 'startSession'`).
*   Handles subsequent messages via `action: 'sendMessage'`.

## Setup and Usage

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    cd YOUR_REPO_NAME
    ```
2.  **Replace Webhook URL Placeholder:**
    *   Open `index.html`.
    *   Find the `window.MyChatWidgetConfig` script block.
    *   Replace `'YOUR_N8N_WEBHOOK_URL_HERE'` with the actual webhook URL from your active n8n workflow.
    *   **Crucially:** Do not commit your actual URL if this is a public repository! You will need to handle this replacement when deploying or sharing.
3.  **Add Your Logo:**
    *   Place your company logo file (e.g., `logo.jpg`) in the `img/` directory.
    *   Update the `branding.logo` path in `index.html` if necessary.
4.  **Set up n8n Workflow:**
    *   Create an n8n workflow starting with a **Webhook** node (Method: POST).
    *   Configure your workflow to receive JSON data containing `sessionId`, `action`, and potentially `text`.
    *   Implement logic to handle:
        *   `action: 'startSession'`: This should trigger the initial message sequence (e.g., asking for language).
        *   `action: 'sendMessage'`: This handles user's typed input.
        *   *Future TODO:* Implement logic for handling button click payloads sent back from the widget.
    *   Ensure your n8n workflow responds with a JSON object containing an `output` field for text messages (e.g., `{ "output": "Your bot response" }`).
    *   Activate your n8n workflow and copy its webhook URL.
5.  **Test Locally:**
    *   Open `index.html` in your web browser.
    *   Open browser Developer Tools (F12) to monitor the Console and Network tabs.
    *   Click the chat toggle button, then "Start New Chat", and send messages.
6.  **Deploy:**
    *   This is a static site. You can deploy it to any static hosting service like GitHub Pages, Cloudflare Pages, Netlify, Vercel, or a simple web server.
    *   **Remember to replace the webhook URL placeholder with your live n8n webhook URL during deployment.**

## Backend (n8n) Requirements & TODO

To implement the complex chat flow described in the original client requirements, your n8n workflow needs to handle the following logic, triggered by the webhook receiving data from the frontend widget:

*   **Initial `startSession` Action:**
    *   Recognize this action.
    *   Send the first message (e.g., "Welcome! Please select a language:"). *This requires updating the frontend to handle receiving button options*.
*   **`sendMessage` Action:**
    *   Receive the user's typed message or button payload.
    *   **State Management:** Look up the conversation state based on `sessionId` (e.g., using a database like PostgreSQL, MySQL, Deta, NocoDB). What step is the user at? What language did they choose?
    *   **Conditional Logic:** Based on the current state and the user's input, determine the next step in the flow (using If/Switch nodes).
        *   If expecting language: Check input ("English", "Arabic", "語言", "عربي"). Store the chosen language in the state. Ask for inquiry type.
        *   If expecting inquiry type: Check input ("New Order", "Existing Order", "General Inquiry", "New", "Order", "General", etc. - *consider using an LLM or keyword matching here for flexibility*). Update state.
        *   If in "New Order" path: Provide options (e.g., "View Products" - *requires frontend button support*, "Talk to Agent").
        *   If in "Existing Order" path: Ask for order number. *Requires frontend to handle text input.*
        *   If expecting Order Number: Validate format. Look up order details (*requires integration with client's order system API*). Respond with confirmation or error.
        *   If in "General Inquiry" path: Allow free text. Pass to AI agent or human agent.
    *   **Escalation Logic:**
        *   Check for frustration keywords in user input (*requires keyword detection*).
        *   Implement inactivity trigger (*requires tracking message timestamps and potentially a scheduled workflow to check for stale sessions*).
        *   Route to a human agent queue (if n8n connects to a helpdesk or provides a notification mechanism).
    *   **Persistent "Start Over" Button:** Define this option within the flow and handle the user sending its payload back to reset the state. *Requires frontend button support.*
    *   **Prepare Response:** Based on the logic, determine the response type (text, text + buttons) and content. Format the response JSON according to what the frontend widget expects (currently just `{ "output": "..." }`, but needs enhancement for buttons).

## Frontend (Widget JS) TODO

To fully support the complex flow requirements, the `js/chat-widget-custom.js` needs enhancements, particularly for displaying and handling interactive elements:

*   **Receive and Render Buttons:**
    *   Update `sendMessageToBackend` (or create `addRichContentMessage`) to check for a `buttons` array (or similar structure) in the JSON response from n8n.
    *   If buttons are present, create and add HTML elements for these buttons within the bot's message bubble or below it.
*   **Handle Button Clicks:**
    *   Add event listeners to the dynamically created button elements.
    *   When clicked, prevent the default action.
    *   Get the predefined `payload` value associated with the clicked button.
    *   Call `sendMessageToBackend` with an appropriate payload (e.g., `{ action: 'buttonClick', buttonValue: '...' }` or simply send the button value as the `text` of a regular message, depending on how you structure it in n8n).
    *   (Optional) Disable the buttons after one is clicked.
*   **Add Typing Indicator:** Provide visual feedback while waiting for n8n's response.
*   **Implement History Loading (Optional):** When opening a chat with an existing session ID, send a specific action (`action: 'loadHistory'`) to n8n. The n8n workflow would need logic to fetch past messages for that `sessionId` from the database and send them back in a format the frontend can understand and display upon loading.
*   Improve CSS/Responsiveness: Ensure the widget looks good on various devices.

This structure and README provide a clear plan for developing both the frontend widget and the backend n8n workflow to meet the client's complex chat flow requirements.
