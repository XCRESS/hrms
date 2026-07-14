# HRMS - Human Resource Management System

A modern, comprehensive Human Resource Management System built with React and Node.js, designed for scalability and ease of use.

## 🚀 Overview

HRMS is a full-featured human resource management platform that handles employee lifecycle management, attendance tracking, leave management, salary processing, and comprehensive reporting. Built with modern web technologies, it provides role-based access control and real-time updates across all modules.

### ✨ Key Features

- **👥 Employee Management**: Complete employee lifecycle from onboarding to exit
- **⏰ Attendance Tracking**: Real-time check-in/check-out with automatic status detection
- **🏖️ Leave Management**: Comprehensive leave application and approval workflow  
- **💰 Salary Processing**: Automated salary calculations with tax deductions (Indian tax regime support)
- **📊 Analytics & Reporting**: Real-time dashboards and detailed reports
- **🔐 Role-Based Access**: Admin, HR, and Employee roles with appropriate permissions
- **📱 Mobile Responsive**: Optimized for mobile and desktop usage
- **🔔 Notifications**: Email, in-app, and WhatsApp notifications for important events
- **💬 AI Chatbot**: OpenAI-powered intelligent assistant for HR-related queries
- **📋 Document Management**: Secure document upload and management with AWS S3
- **📄 PDF Generation**: Professional salary slip PDFs with company branding
- **📱 WhatsApp Integration**: Automated notifications via WhatsApp Web.js

### 🏗️ Architecture

- **Frontend**: React 19 + Vite + Tailwind CSS + Custom API Client
- **Backend**: Node.js + Express.js + MongoDB + JWT Authentication
- **Database**: MongoDB with Mongoose ODM
- **Deployment**: Vercel (Frontend) + Railway (Backend)
- **Package Manager**: PNPM for improved performance

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS with custom theming
- **UI Components**: Radix UI + custom component library
- **State Management**: Custom API Client + React Context
- **Form Handling**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Maps**: Leaflet + React Leaflet
- **Icons**: Lucide React + Tabler Icons
- **PDF Generation**: jsPDF
- **Animations**: Framer Motion

### Backend
- **Runtime**: Node.js 22+
- **Framework**: Express.js 5
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with bcryptjs
- **File Storage**: AWS S3
- **Email Service**: Resend + Nodemailer
- **Push Notifications**: Web Push
- **WhatsApp Integration**: WhatsApp Web.js for automated notifications
- **AI Integration**: OpenAI API for intelligent chatbot
- **PDF Generation**: jsPDF for professional salary slips
- **Scheduling**: Node-cron

## 🚀 Quick Start

### Prerequisites

- Node.js 22.0.0 or higher
- PNPM 9.0.0 or higher
- MongoDB database
- AWS S3 bucket (for file storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hrms
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   pnpm install
   
   # Install frontend dependencies
   cd ../frontend  
   pnpm install
   ```

3. **Environment Configuration**

   **Backend** (`backend/.env`):
   ```env
   PORT=4000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d
   
   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=your_aws_region
   S3_BUCKET_NAME=your_s3_bucket_name
   
   # Email Configuration
   RESEND_API_KEY=your_resend_api_key
   SENDER_EMAIL=your_sender_email
   
   # OpenAI Configuration (optional)
   OPENAI_API_KEY=your_openai_api_key
   ```

   **Frontend** (`frontend/.env`):
   ```env
   VITE_API_URL=http://localhost:4000/api
   VITE_APP_NAME=HRMS
   ```

4. **Start Development Servers**

   **Backend**:
   ```bash
   cd backend
   pnpm dev
   ```

   **Frontend**:
   ```bash
   cd frontend
   pnpm dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:4000/api

### Production Build

**Frontend**:
```bash
cd frontend
pnpm build
pnpm preview   # Preview production build
```

**Backend**:
```bash
cd backend
pnpm start
```

## 📁 Project Structure

```
hrms/
├── backend/                 # Node.js backend
│   ├── controllers/        # Route controllers
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middlewares/        # Custom middlewares
│   ├── services/           # Business logic services
│   ├── utils/              # Utility functions
│   ├── validators/         # Request validators
│   └── server.js           # Entry point
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── dashboard/  # Dashboard components
│   │   │   ├── employee/   # Employee components
│   │   │   ├── hr/         # HR components
│   │   │   └── ui/         # Reusable UI components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utility libraries
│   │   ├── providers/      # Context providers
│   │   ├── service/        # API services
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json
│
├── CLAUDE.md               # Development guidelines
├── plan.md                 # Implementation roadmap
└── README.md               # This file
```

## 🔑 User Roles & Permissions

### Admin
- Full system access
- User management and role assignment
- System configuration and settings
- All HR and employee functionalities

### HR
- Employee lifecycle management
- Attendance and leave oversight
- Salary structure and processing
- Reporting and analytics
- All employee functionalities

### Employee  
- Personal profile management
- Attendance check-in/check-out
- Leave application and history
- Salary slip access
- Personal dashboard and analytics

## 🔄 Development Workflow

### Code Quality
```bash
# Lint frontend code
cd frontend
pnpm lint

# Build check
pnpm build
```

### Testing
- Test main workflows: Login → Dashboard → Core features
- Mobile responsiveness testing
- Error handling verification
- Network failure resilience

### Git Workflow
1. Create feature branch from `main`
2. Make changes and test thoroughly  
3. Run lint checks and build verification
4. Create pull request with descriptive title
5. Code review and merge to `main`

## 📊 Key Features Deep Dive

### Attendance System
- **Smart Status Detection**: Automatic late/present/absent status based on business rules
- **Working Day Calculation**: Excludes weekends and holidays
- **Leave Integration**: Approved leaves auto-mark attendance as present
- **Real-time Dashboard**: Current status and pending actions

### Leave Management
- **Multi-type Support**: Annual, sick, casual, maternity leaves
- **Approval Workflow**: Manager/HR approval with email notifications
- **Balance Tracking**: Real-time leave balance calculations
- **Calendar Integration**: Visual leave calendar

### Salary Processing
- **Structure Management**: Flexible earning and deduction components
- **Tax Compliance**: Support for Indian old and new tax regimes
- **Bulk Processing**: Generate salary slips for all employees
- **Publish/Unpublish**: Draft workflow for salary slip access

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Hierarchical permission system
- **Data Encryption**: Sensitive data protection
- **Audit Logging**: Track system changes and access

## 🐛 Troubleshooting

### Common Issues

**Backend not starting:**
```bash
# Check if port 4000 is already in use
netstat -ano | findstr :4000
taskkill //F //PID <process_id>
```

**Database connection issues:**
- Verify MongoDB URI in `.env`
- Check network connectivity
- Ensure MongoDB service is running

**Frontend build errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && pnpm install`
- Check for TypeScript errors: Fix all linting issues
- Verify environment variables are set

## 📈 Performance Optimization

- **Bundle Splitting**: Automated code splitting by routes
- **Image Optimization**: Lazy loading and responsive images  
- **API Optimization**: Request deduplication with TanStack Query
- **Mobile Performance**: Touch-optimized UI components

## 🤝 Contributing

1. Read `CLAUDE.md` for development guidelines
2. Follow existing code patterns and conventions
3. Test mobile responsiveness on real devices
4. Ensure all lint checks pass before committing
5. Write descriptive commit messages

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For development support and troubleshooting, refer to:
- `CLAUDE.md` - Comprehensive development guide
- `plan.md` - Implementation roadmap and architecture decisions
- GitHub Issues - Bug reports and feature requests

---

**Built with ❤️ for modern HR management**