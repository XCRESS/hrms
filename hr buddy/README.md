# HRMS Buddy - AI Assistant

HRMS Buddy is an AI-powered chatbot that helps HR personnel manage the HRMS portal using natural language queries.

## Features

- 🤖 AI-powered conversation using GPT-4
- 🔧 Integration with HRMS API endpoints
- 📊 Employee data insights and queries
- 💼 HR management assistance
- 🌐 RESTful API with FastAPI
- 📱 Real-time chat interface

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in this directory with your OpenAI API key:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Start the Server

**Option A: Using the startup script (recommended)**
```bash
python start_server.py
```

**Option B: Direct uvicorn command**
```bash
uvicorn fastapi_server:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Access the API

- **Server**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## API Endpoints

### POST /chat
Send a message to HRMS Buddy and get an AI response.

**Request:**
```json
{
  "message": "How many employees do we have?",
  "conversation_id": "optional_conversation_id"
}
```

**Response:**
```json
{
  "response": "Based on the current data, we have 96 employees in total.",
  "conversation_id": "unique_conversation_id",
  "timestamp": "2024-01-20T10:30:00"
}
```

### GET /conversations/{conversation_id}
Retrieve conversation history.

### DELETE /conversations/{conversation_id}
Delete a conversation.

## Available Tools

HRMS Buddy can access the following HRMS functions:

- **get_all_employee**: Get list of all employees with their information
- **get_my_profile**: Get the current user's profile information

## Frontend Integration

The chatbot is integrated with the React frontend. Make sure both servers are running:

1. **Backend (HRMS Buddy)**: http://localhost:8000
2. **Frontend (React)**: http://localhost:5173

## How It Works

1. **User Query**: User sends a natural language query
2. **Planning**: AI analyzes the query and creates an execution plan
3. **Tool Selection**: AI selects appropriate HRMS API tools
4. **Execution**: Tools are called to fetch relevant data
5. **Response**: AI formulates a natural language response

## Example Queries

- "How many employees do we have?"
- "Show me my profile information"
- "What is the current employee count?"
- "Tell me about the HR team"

## Troubleshooting

### Server Won't Start
- Check if port 8000 is available
- Verify OpenAI API key in .env file
- Install all requirements: `pip install -r requirements.txt`

### Connection Issues
- Ensure the HRMS backend API is accessible
- Check network connectivity
- Verify API credentials are correct

### Chat Not Working
- Check browser console for errors
- Ensure both frontend and backend servers are running
- Verify CORS settings allow your frontend origin

## Development

To extend HRMS Buddy with new tools:

1. Add new API functions in `fastapi_server.py`
2. Update the `available_tools` dictionary
3. Update the system prompt with tool descriptions
4. Test the new functionality

## Security Notes

- Keep your OpenAI API key secure and never commit it to version control
- The current setup uses hardcoded HRMS credentials - consider implementing proper authentication
- In production, use environment variables for all sensitive configuration

## Support

For issues or questions, check the server logs and API documentation at http://localhost:8000/docs