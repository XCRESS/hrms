# HRMS System Architecture

A comprehensive guide to the architectural design, patterns, and implementation details of the Human Resource Management System.

## 🏗️ High-Level Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   React + Vite  │◄──►│ Node.js/Express │◄──►│    MongoDB      │
│   Port: 5173    │    │   Port: 4000    │    │   Cloud/Local   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────────┐
        │           External Services                    │
        ├─────────────┬─────────────┬─────────────────┤
        │  AWS S3     │   Resend    │    OpenAI       │
        │ File Storage│   Email     │   Chatbot       │
        └─────────────┴─────────────┴─────────────────┘
```

### Technology Stack

**Frontend (Client-Side)**
- **Framework:** React 19 with Vite build tool
- **Styling:** Tailwind CSS + Radix UI components  
- **State Management:** Custom API Client + React Context
- **Routing:** React Router v7
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts for analytics
- **Maps:** Leaflet for location services

**Backend (Server-Side)**
- **Runtime:** Node.js 22+
- **Framework:** Express.js 5
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT with bcryptjs hashing
- **File Storage:** AWS S3 integration
- **Email Service:** Resend + Nodemailer
- **Caching:** In-memory caching with optimization

**Database Design**
- **Type:** NoSQL (MongoDB)
- **ODM:** Mongoose for schema validation
- **Relationships:** Referenced documents with population
- **Indexing:** Optimized for frequent queries

---

## 🎯 Core Architecture Principles

### 1. Separation of Concerns
- **Frontend:** Presentation logic and user interaction
- **Backend:** Business logic and data processing
- **Database:** Data persistence and relationships

### 2. Role-Based Access Control (RBAC)
- **Admin:** Full system access and user management
- **HR:** Employee management and HR operations
- **Employee:** Personal data access only

### 3. Modular Design
- Feature-based component organization
- Reusable UI component library
- Service-oriented backend architecture

### 4. Scalable Data Architecture
- Dual-model approach: User authentication + Employee HR data
- Efficient indexing and query optimization
- Pagination for large datasets

---

## 📊 Data Architecture & Models

### User-Employee Relationship Model

```mermaid
graph LR
    A[User Model] --> B[Authentication & Login]
    A --> C[Role Assignment]
    A --> D[JWT Tokens]
    
    E[Employee Model] --> F[HR Data]
    E --> G[Personal Details]
    E --> H[Professional Info]
    
    A -.-> E
    linkStyle 3 stroke-dasharray: 5 5
```

### Core Data Models

#### 1. User Model (Authentication)
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  role: ['admin', 'hr', 'employee'],
  isActive: Boolean,
  linkedEmployee: ObjectId (ref: Employee),
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. Employee Model (HR Data)
```javascript
{
  _id: ObjectId,
  employeeId: String (unique),
  name: String,
  email: String (unique),
  phone: String (10 digits),
  aadhaarNumber: String (12 digits),
  department: String,
  designation: String,
  dateOfJoining: Date,
  salary: Number,
  personalDetails: {
    dateOfBirth: Date,
    gender: String,
    address: Object,
    emergencyContact: Object,
    parentDetails: Object
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    bankName: String
  },
  professionalDetails: {
    workLocation: String,
    reportingManager: String,
    probationEndDate: Date
  },
  isActive: Boolean,
  linkedUser: ObjectId (ref: User)
}
```

#### 3. Attendance Model
```javascript
{
  _id: ObjectId,
  employeeId: ObjectId (ref: Employee),
  date: Date,
  checkInTime: Date,
  checkOutTime: Date,
  workingHours: Number,
  status: ['present', 'absent', 'late', 'half-day'],
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  isRegularized: Boolean,
  regularizationReason: String
}
```

#### 4. Leave Model
```javascript
{
  _id: ObjectId,
  employeeId: ObjectId (ref: Employee),
  type: ['annual', 'sick', 'casual', 'maternity', 'paternity'],
  startDate: Date,
  endDate: Date,
  totalDays: Number,
  reason: String,
  status: ['pending', 'approved', 'rejected'],
  appliedDate: Date,
  approvedBy: ObjectId (ref: Employee),
  approvedDate: Date,
  adminComments: String
}
```

#### 5. Salary Structure Model
```javascript
{
  _id: ObjectId,
  employeeId: ObjectId (ref: Employee),
  basicSalary: Number,
  allowances: {
    hra: Number,
    transport: Number,
    medical: Number,
    other: Number
  },
  deductions: {
    pf: Number,
    esi: Number,
    tax: Number,
    other: Number
  },
  taxRegime: ['old', 'new'],
  effectiveDate: Date
}
```

### Database Relationships

```mermaid
erDiagram
    User ||--o| Employee : "linked via ID"
    Employee ||--o{ Attendance : "has many"
    Employee ||--o{ Leave : "requests many"
    Employee ||--|| SalaryStructure : "has one"
    Employee ||--o{ SalarySlip : "generates many"
    Employee ||--o{ Regularization : "submits many"
    Employee ||--o{ TaskReport : "submits many"
    Employee ||--o{ Document : "uploads many"
```

---

## 🏛️ Backend Architecture

### Layered Architecture Pattern

```
┌─────────────────────────────────────────┐
│                Routes                   │  ← HTTP endpoints & routing
├─────────────────────────────────────────┤
│              Middlewares                │  ← Auth, validation, CORS
├─────────────────────────────────────────┤
│              Controllers               │  ← Request handling logic
├─────────────────────────────────────────┤
│               Services                 │  ← Business logic layer
├─────────────────────────────────────────┤
│                Models                  │  ← Database schemas
├─────────────────────────────────────────┤
│               Database                 │  ← MongoDB persistence
└─────────────────────────────────────────┘
```

### Directory Structure Breakdown

```
backend/
├── controllers/          # Request handling logic
│   ├── auth.controllers.js
│   ├── employee.controllers.js
│   ├── attendance.controllers.js
│   ├── leave.controllers.js
│   └── salary.controllers.js
├── models/              # MongoDB schemas
│   ├── User.model.js
│   ├── Employee.model.js
│   ├── Attendance.model.js
│   └── Leave.model.js
├── routes/              # API endpoints
│   ├── auth.js
│   ├── employee.js
│   ├── attendance.js
│   └── leave.js
├── middlewares/         # Cross-cutting concerns
│   ├── auth.middleware.js
│   ├── role.middleware.js
│   └── validation.middleware.js
├── services/            # Business logic
│   ├── emailService.js
│   ├── attendanceService.js
│   └── salaryService.js
├── utils/               # Helper functions
│   ├── response.js
│   ├── errorHandler.js
│   └── pdfGenerator.js
└── validators/          # Input validation
    ├── employee.validator.js
    └── attendance.validator.js
```

### Error Handling Architecture

**Two-Tier Error Handling System:**

1. **Standard Pattern** (Most Controllers)
   ```javascript
   // Using asyncHandler wrapper
   const getEmployees = asyncHandler(async (req, res) => {
     const employees = await Employee.find();
     res.success(employees, 'Employees fetched successfully');
   });
   ```

2. **Advanced Pattern** (Attendance System)
   ```javascript
   // Domain-specific error handling
   const checkIn = async (req, res) => {
     try {
       const result = await attendanceService.processCheckIn(req.user, req.body);
       res.success(result, 'Check-in successful');
     } catch (error) {
       if (error instanceof BusinessLogicError) {
         return res.businessError(error.message, error.context);
       }
       throw error; // Let global handler process
     }
   };
   ```

### Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant Client
    participant Auth Middleware
    participant Role Middleware
    participant Controller
    participant Database

    Client->>Auth Middleware: Request with Bearer token
    Auth Middleware->>Auth Middleware: Verify JWT token
    Auth Middleware->>Database: Get user details
    Database-->>Auth Middleware: User data with role
    Auth Middleware->>Role Middleware: Pass user data
    Role Middleware->>Role Middleware: Check role permissions
    Role Middleware->>Controller: Authorized request
    Controller->>Database: Execute business logic
    Database-->>Controller: Return data
    Controller-->>Client: JSON response
```

---

## 🎨 Frontend Architecture

### Component Hierarchy

```
src/
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   └── DataTable.jsx
│   ├── dashboard/          # Dashboard specific components
│   │   ├── AdminDashboard.jsx
│   │   ├── EmployeeDashboard.jsx
│   │   └── MetricsCard.jsx
│   ├── employee/           # Employee management
│   │   ├── EmployeeList.jsx
│   │   ├── EmployeeForm.jsx
│   │   └── EmployeeProfile.jsx
│   ├── hr/                 # HR specific components
│   │   ├── LeaveApproval.jsx
│   │   ├── AttendanceReport.jsx
│   │   └── SalaryManagement.jsx
│   └── common/             # Shared components
│       ├── Header.jsx
│       ├── Sidebar.jsx
│       └── Loading.jsx
├── contexts/              # React contexts
│   ├── AuthContext.js
│   ├── ThemeContext.js
│   └── NotificationContext.js
├── hooks/                 # Custom hooks
│   ├── useAuth.js
│   ├── useEmployees.js
│   └── useAttendance.js
├── services/              # API integration
│   ├── api.js            # Base API client
│   ├── authService.js
│   └── employeeService.js
└── utils/                 # Helper functions
    ├── dateUtils.js
    ├── formatters.js
    └── validators.js
```

### State Management Strategy

```mermaid
graph TD
    A[Custom API Client] --> B[HTTP Request Handling]
    A --> C[Response Transformation]
    A --> D[Error Handling]
    
    E[React Context] --> F[Theme State]
    E --> G[User Authentication]
    E --> H[UI Preferences]
    
    I[Component State] --> J[Form Data]
    I --> K[UI State]
    I --> L[Modal State]
```

**State Categories:**
- **Server State:** Custom API Client (775-line implementation in `apiClient.js`)
- **Global State:** Managed by React Context (auth, theme, notifications)  
- **Local State:** Managed by component useState (forms, UI states)

**API Client Architecture:**
- Comprehensive 775-line custom implementation
- Centralized HTTP request handling
- Built-in error handling and response transformation
- Authentication token management
- Request/response interceptors

### Role-Based Component Rendering

```javascript
// Role-based conditional rendering pattern
const EmployeeActions = () => {
  const { user } = useAuth();
  
  return (
    <div className="actions">
      {/* Always visible to authenticated users */}
      <Button>View Profile</Button>
      
      {/* HR and Admin only */}
      {(['hr', 'admin'].includes(user.role)) && (
        <Button>Edit Employee</Button>
      )}
      
      {/* Admin only */}
      {user.role === 'admin' && (
        <Button>Delete Employee</Button>
      )}
    </div>
  );
};
```

---

## 🔄 Business Logic Architecture

### Attendance System Design

**Business Rules Engine:**
```javascript
const attendanceRules = {
  checkInWindow: {
    onTime: '09:55',
    late: '09:55+',
    absent: 'no-checkin'
  },
  workingHours: {
    full: 8,
    minimum: 4,
    halfDay: '< 4 hours'
  },
  statusCalculation: (checkIn, checkOut, workingHours) => {
    if (!checkIn) return 'absent';
    if (checkIn > '09:55') return 'late';
    if (workingHours < 4) return 'half-day';
    return 'present';
  }
};
```

**Leave Integration:**
- Approved leaves automatically mark attendance as 'present'
- Working day calculation excludes weekends and holidays
- Leave balance deduction happens on approval

### Salary Processing Architecture

**Multi-Component System:**

1. **Salary Structure** (Independent Management)
   - Defines earning components and amounts
   - Supports both old and new tax regimes
   - Can be modified without affecting historical slips

2. **Salary Slip Generation** (Monthly Process)
   - Reads current salary structure
   - Calculates taxes based on regime
   - Generates monthly slip with breakdowns

3. **Publish/Unpublish Workflow**
   - Draft → Published workflow
   - Only published slips visible to employees
   - Bulk operations for HR efficiency

### Notification System Architecture

```mermaid
graph TD
    A[Event Trigger] --> B{Event Type}
    B --> C[Leave Approval]
    B --> D[Birthday Alert]
    B --> E[Milestone Alert]
    B --> F[System Notification]
    
    C --> G[Email Service]
    D --> G
    E --> G
    F --> G
    
    C --> H[Push Notification]
    D --> H
    E --> H
    F --> H
    
    G --> I[Resend API]
    H --> J[Web Push API]
```

**Notification Types:**
- **Real-time:** Immediate notifications (leave approval, check-in)
- **Scheduled:** Cron-based notifications (birthday alerts, reminders)
- **Bulk:** Mass notifications (announcements, policy updates)

---

## 🔐 Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Backend
    participant Database
    participant JWT

    Client->>Backend: POST /auth/login {email, password}
    Backend->>Database: Verify credentials
    Database-->>Backend: User data
    Backend->>JWT: Generate token
    JWT-->>Backend: Signed JWT
    Backend-->>Client: {user, token}
    
    Note over Client: Store token in localStorage
    
    Client->>Backend: Subsequent requests with Bearer token
    Backend->>JWT: Verify token
    JWT-->>Backend: Decoded user data
    Backend-->>Client: Authorized response
```

### Data Security Measures

1. **Password Security**
   - bcryptjs hashing with salt rounds
   - Minimum password complexity requirements
   - Password reset via secure token system

2. **Data Validation**
   - Input sanitization at API level
   - Mongoose schema validation
   - Frontend form validation with Zod

3. **Access Control**
   - JWT-based authentication
   - Role-based authorization middleware
   - Resource-level permission checks

4. **Data Protection**
   - Sensitive data encrypted at rest
   - HTTPS for data transmission
   - Environment variable protection

### Data Privacy Architecture

```javascript
// Data access patterns by role
const dataAccessRules = {
  admin: {
    employees: 'ALL',
    attendance: 'ALL',
    salary: 'ALL',
    settings: 'WRITE'
  },
  hr: {
    employees: 'ALL',
    attendance: 'ALL', 
    salary: 'ALL',
    settings: 'READ'
  },
  employee: {
    employees: 'OWN_ONLY',
    attendance: 'OWN_ONLY',
    salary: 'OWN_ONLY',
    settings: 'NONE'
  }
};
```

---

## 🚀 Performance Architecture

### Frontend Performance Optimization

1. **Code Splitting & Lazy Loading**
   ```javascript
   // Route-based code splitting
   const EmployeeManagement = lazy(() => import('./components/employee/EmployeeList'));
   const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
   ```

2. **API Client Optimization**
   ```javascript
   // Custom API client with built-in error handling
   const employees = await apiClient.getEmployees(filters);
   
   // API client handles:
   // - Authentication token attachment
   // - Response transformation
   // - Error handling and user feedback
   // - Request/response logging
   ```

3. **Component Optimization**
   ```javascript
   // Memoization for expensive renders
   const EmployeeCard = memo(({ employee }) => {
     return <div>{employee.name}</div>;
   });
   ```

### Backend Performance Optimization

1. **Database Indexing**
   ```javascript
   // Optimized indexes for frequent queries
   employeeSchema.index({ employeeId: 1 }, { unique: true });
   attendanceSchema.index({ employeeId: 1, date: -1 });
   leaveSchema.index({ employeeId: 1, status: 1 });
   ```

2. **Query Optimization**
   ```javascript
   // Population with field selection
   const employees = await Employee
     .find({ isActive: true })
     .select('name email department designation')
     .populate('linkedUser', 'email role')
     .limit(20);
   ```

3. **Response Optimization**
   ```javascript
   // Standardized response format
   res.success = (data, message) => {
     res.json({
       success: true,
       message,
       data,
       timestamp: new Date().toISOString()
     });
   };
   ```

### Caching Strategy

```mermaid
graph LR
    A[Client Request] --> B{Cache Hit?}
    B -->|Yes| C[Return Cached Data]
    B -->|No| D[Fetch from Database]
    D --> E[Update Cache]
    E --> F[Return Fresh Data]
    
    G[Background Jobs] --> H[Cache Invalidation]
    H --> I[Smart Cache Updates]
```

---

## 📱 Mobile & Responsive Design Architecture

### Mobile-First Approach

```css
/* Responsive breakpoint strategy */
.component {
  /* Mobile first (default) */
  width: 100%;
  padding: 1rem;
  
  /* Tablet */
  @media (min-width: 768px) {
    width: 50%;
    padding: 1.5rem;
  }
  
  /* Desktop */
  @media (min-width: 1024px) {
    width: 33.333%;
    padding: 2rem;
  }
}
```

### Touch-Optimized Components

- Minimum 44px touch targets
- Swipe gestures for mobile navigation
- Pull-to-refresh functionality
- Optimized form inputs for mobile keyboards

---

## 🔧 Integration Architecture

### External Service Integration

```mermaid
graph TD
    A[HRMS Core] --> B[AWS S3]
    A --> C[Resend Email]
    A --> D[OpenAI API]
    A --> E[WhatsApp Web.js]
    A --> F[Web Push Service]
    A --> G[jsPDF Library]
    
    B --> H[Document Storage]
    C --> I[Email Notifications]
    D --> J[HR Chatbot]
    E --> K[WhatsApp Notifications]
    F --> L[Browser Push Notifications]
    G --> M[PDF Generation]
```

**Service Integration Details:**
- **AWS S3:** Secure document storage and file management
- **Resend:** Modern email delivery service
- **OpenAI:** AI-powered HR chatbot assistance
- **WhatsApp Web.js:** Automated WhatsApp notifications
- **Web Push:** Browser-based push notifications
- **jsPDF:** Client-side PDF generation for salary slips

### API Integration Patterns

1. **Service Layer Pattern**
   ```javascript
   // Centralized external service handling
   class EmailService {
     constructor() {
       this.resend = new Resend(process.env.RESEND_API_KEY);
     }
     
     async sendWelcomeEmail(employee) {
       return await this.resend.emails.send({
         from: process.env.SENDER_EMAIL,
         to: employee.email,
         subject: 'Welcome to HRMS',
         template: 'welcome',
         data: { employee }
       });
     }
   }
   ```

2. **Error Handling for External Services**
   ```javascript
   // Graceful degradation for service failures
   try {
     await emailService.sendNotification(data);
   } catch (error) {
     logger.error('Email service failed:', error);
     // Continue operation, log for manual follow-up
     await logService.logFailedNotification(data, error);
   }
   ```

---

## 🧪 Testing Architecture

### Testing Strategy (Planned)

```mermaid
graph TD
    A[Unit Tests] --> B[Component Tests]
    A --> C[Service Tests]
    A --> D[Utility Tests]
    
    E[Integration Tests] --> F[API Tests]
    E --> G[Database Tests]
    E --> H[Service Integration]
    
    I[E2E Tests] --> J[User Workflows]
    I --> K[Critical Paths]
    I --> L[Cross-browser Tests]
```

### Testing Frameworks (Recommended)

**Frontend:**
- **Unit/Component:** Jest + React Testing Library
- **E2E:** Playwright or Cypress
- **Visual:** Storybook for component documentation

**Backend:**
- **Unit:** Jest + Supertest
- **Integration:** Jest + MongoDB Memory Server
- **API:** Postman/Newman for automated testing

---

## 🚀 Deployment Architecture

### Environment Configuration

```mermaid
graph TD
    A[Development] --> B[Local Database]
    A --> C[Local Services]
    A --> D[Hot Reload]
    
    E[Staging] --> F[Cloud Database]
    E --> G[External Services]
    E --> H[Build Optimization]
    
    I[Production] --> J[Replica Sets]
    I --> K[CDN Integration]
    I --> L[Monitoring & Logging]
```

### Infrastructure Design

**Frontend Deployment (Vercel):**
- Automatic builds from Git commits
- Edge caching and CDN distribution
- Environment-specific builds
- SSL/TLS termination

**Backend Deployment (Railway):**
- Container-based deployment
- Auto-scaling based on load
- Health monitoring and restarts
- Database connection pooling

### Environment Variables Management

```bash
# Development
VITE_API_URL=http://localhost:4000/api
MONGODB_URI=mongodb://localhost:27017/hrms_dev

# Production  
VITE_API_URL=https://api.yourhrms.com/api
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hrms_prod
```

---

## 📊 Monitoring & Observability Architecture

### Logging Strategy

```javascript
// Structured logging implementation
const logger = {
  info: (message, context) => {
    console.log({
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString(),
      service: 'hrms-backend'
    });
  },
  error: (message, error, context) => {
    console.error({
      level: 'error', 
      message,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      service: 'hrms-backend'
    });
  }
};
```

### Health Monitoring

```javascript
// Health check endpoints
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    }
  };
  res.json(healthCheck);
});
```

---

## 🔄 Future Architecture Considerations

### Scalability Enhancements

1. **Microservices Migration**
   - Split into domain-specific services
   - Event-driven communication
   - Independent scaling

2. **Caching Layer**
   - Redis for session management
   - Query result caching
   - Real-time data synchronization

3. **Search Enhancement**
   - Elasticsearch integration
   - Full-text search capabilities
   - Advanced filtering and sorting

### Technology Evolution

1. **Database Optimization**
   - MongoDB sharding for large datasets
   - Read replicas for query optimization
   - Time-series data for analytics

2. **Real-time Features**
   - WebSocket integration for live updates
   - Server-sent events for notifications
   - Real-time collaboration features

3. **Analytics & Reporting**
   - Data warehouse integration
   - Business intelligence dashboards
   - Predictive analytics capabilities

---

## 📚 Architecture Decision Records (ADRs)

### Key Architectural Decisions

1. **MongoDB over SQL Database**
   - **Rationale:** Flexible schema for HR data evolution
   - **Trade-offs:** Less ACID compliance, but better scalability
   - **Status:** Active

2. **JWT over Session-based Authentication**
   - **Rationale:** Stateless authentication for API scalability
   - **Trade-offs:** Token management complexity
   - **Status:** Active

3. **Custom API Client over Redux**
   - **Rationale:** Full control over HTTP handling and error management
   - **Trade-offs:** More code to maintain, but complete customization
   - **Status:** Active (775-line implementation)

4. **Dual User-Employee Model**
   - **Rationale:** Separation of authentication and HR concerns
   - **Trade-offs:** Additional complexity, but cleaner architecture
   - **Status:** Active

---

## 🛠️ Development Guidelines

### Code Organization Principles

1. **Feature-based Organization:** Group related functionality together
2. **Separation of Concerns:** Clear boundaries between layers
3. **Dependency Injection:** Loose coupling between components
4. **Error Boundaries:** Graceful error handling and recovery
5. **Documentation:** Self-documenting code with clear naming

### Performance Guidelines

1. **Database:** Use indexes, limit query scope, avoid N+1 queries
2. **Frontend:** Lazy loading, memoization, virtual scrolling
3. **API:** Pagination, field selection, response compression
4. **Caching:** Strategic caching at multiple levels

### Security Guidelines

1. **Input Validation:** Validate all inputs at API boundary
2. **Authentication:** Verify identity on every request
3. **Authorization:** Check permissions at resource level
4. **Data Protection:** Encrypt sensitive data, use HTTPS

---

This architecture documentation provides a comprehensive overview of the HRMS system design, covering all major architectural decisions, patterns, and implementation details. It serves as a reference for developers, architects, and stakeholders to understand the system's structure and evolution strategy.

---

*Last Updated: January 2025*  
*Architecture Version: 1.0*