# Text Saver React App

A modern React-based web application that allows users to input text and interact with OpenAI's ChatGPT API. The app stores all interactions in a SQLite database instead of text files.

## Features

- **Modern React UI**: Clean, responsive interface built with React hooks
- **SQLite Database**: Persistent storage for all user interactions
- **OpenAI Integration**: Direct integration with ChatGPT API
- **Two Main Functions**:
  - **"Suggest"**: Generates word suggestions based on user input
  - **"Ask"**: Gets AI responses to user questions/prompts
- **Interactive Word Bubbles**: Click to select/deselect suggested words
- **History Tracking**: View recent interactions stored in the database
- **Responsive Design**: Works on all devices

## Database Schema

### Asks Table
- Stores user prompts and OpenAI responses when using the "Ask" button
- Fields: `id`, `user_prompt`, `openai_response`, `created_at`

### Suggests Table
- Stores user prompts and OpenAI word suggestions when using the "Suggest" button
- Fields: `id`, `user_prompt`, `openai_words`, `created_at`

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

## Installation

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure OpenAI API**:
   - Edit `config.js` file
   - Replace `your_openai_api_key_here` with your actual OpenAI API key
   - Or set the `OPENAI_API_KEY` environment variable

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   
   This will start both the backend server (port 5000) and React development server (port 3000)

## Usage

1. **Open your browser** and navigate to `http://localhost:3000`

2. **Type or paste text** in the text area

3. **Click "Suggest"** to:
   - Save your text to the database
   - Generate word suggestions using ChatGPT
   - Display interactive word bubbles

4. **Click "Ask"** to:
   - Save your text (with selected words if any) to the database
   - Get an AI response from ChatGPT
   - Display the response on screen

5. **View History**: Scroll down to see recent interactions stored in the database

## API Endpoints

- `GET /api/history` - Retrieve interaction history
- `POST /api/suggest` - Generate word suggestions
- `POST /api/ask` - Get AI response

## Development

### Available Scripts

- `npm start` - Start React development server
- `npm run build` - Build for production
- `npm run server` - Start backend server only
- `npm run dev` - Start both frontend and backend (recommended)

### Project Structure

```
├── public/
│   └── index.html
├── src/
│   ├── App.js          # Main React component
│   ├── App.css         # Component styles
│   ├── index.js        # React entry point
│   └── index.css       # Global styles
├── server.js           # Express backend server
├── config.js           # Configuration file
├── package.json        # Dependencies and scripts
└── database.sqlite     # SQLite database (created automatically)
```

## Configuration

Edit `config.js` to customize:
- OpenAI API settings
- Server port
- Database path
- Model parameters

## Troubleshooting

1. **"OpenAI API Key not configured"**:
   - Check your `config.js` file
   - Ensure your API key is correct

2. **Database errors**:
   - Ensure the app has write permissions in the project directory
   - Check that SQLite is properly installed

3. **Port conflicts**:
   - Change the port in `config.js` if port 5000 is in use

## Browser Compatibility

- Chrome 14+
- Firefox 20+
- Safari 6+
- Edge 12+

## License

MIT License 