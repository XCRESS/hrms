# HR Buddy v2.0 - Unified HR Management AI

HR Buddy is an advanced AI-powered assistant that provides comprehensive HR management capabilities using unified, industry-standard APIs for attendance tracking, task performance analysis, and productivity insights.

## 🚀 New Features v2.0

### Unified API Integration
- **Unified Attendance API** - Real-time analytics, trends, and insights
- **Unified Task Reports API** - AI-powered productivity scoring and recommendations
- **Combined Analysis** - Comprehensive employee performance overview
- **Advanced Analytics** - Team dashboards and productivity benchmarking

### AI-Powered Capabilities
- Intelligent employee search and matching
- Automated productivity scoring and quality analysis
- Pattern recognition and trend analysis
- Actionable insights and recommendations
- Comprehensive performance benchmarking

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

```bash
python app.py
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

## 📋 Available Operations

### Unified Attendance Operations
- **Overview**: Real-time attendance dashboard with analytics
- **Records**: Filtered attendance data with advanced insights  
- **Employee Analysis**: Individual attendance performance analysis
- **Analytics**: Trend analysis and department comparisons

### Unified Task Reports Operations
- **Overview**: Task reporting dashboard with productivity metrics
- **Reports**: Filtered task reports with quality scoring
- **Employee Analysis**: Individual task performance analysis
- **Productivity Metrics**: Team productivity benchmarking
- **AI Insights**: Pattern recognition and recommendations

### Combined Analysis Operations
- **Employee Performance**: Comprehensive attendance + task analysis
- **Team Dashboard**: Complete team performance overview
- **Productivity Analytics**: Advanced insights across all metrics

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

## 🎯 Usage Examples

### Employee Performance Queries
```
"Show me John's performance this month"
"Get Sarah's attendance analysis for the quarter"
"How is the engineering team performing?"
```

### Team Analytics
```
"Give me today's team dashboard"
"Show productivity insights for this month" 
"What are the attendance trends by department?"
```

### Advanced Analysis
```
"Compare productivity metrics across departments"
"Get AI insights on team performance patterns"
"Show me the top performers this quarter"
```

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

## 🚀 Development

### Project Structure
```
hr buddy/
├── chatbot.py              # Main FastAPI application
├── hr_api_client.py        # Unified HR API client
├── hr_functions.py         # HR business logic functions
├── app.py                  # Application launcher
├── requirements.txt        # Python dependencies
├── .env                    # Environment configuration
└── README.md              # This file
```

### Key Components
- **UnifiedHRClient** - Single client for all HR API operations
- **HR Functions** - Business logic for attendance and task analysis
- **AI Engine** - GPT-4o-mini with custom HR prompts
- **Response Formatting** - User-friendly data presentation

## Security Notes

- Keep your OpenAI API key secure and never commit it to version control
- The current setup uses hardcoded HRMS credentials - consider implementing proper authentication
- In production, use environment variables for all sensitive configuration

## Support

For issues or questions, check the server logs and API documentation at http://localhost:8000/docs