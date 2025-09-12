# HRMS Development Guide

A comprehensive guide for developers contributing to the Human Resource Management System.

## 🚀 Quick Start for Developers

### Prerequisites

**Required Software:**
```bash
# Node.js 22+ (use nvm for version management)
nvm install 22
nvm use 22

# PNPM (faster than npm)
npm install -g pnpm

# Git (for version control)
git --version

# MongoDB (local development)
# Option 1: MongoDB Community Server
# Option 2: MongoDB Atlas (cloud)
# Option 3: Docker MongoDB
```

**Development Tools (Recommended):**
- **IDE:** VS Code with extensions:
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint
  - Auto Rename Tag
  - Thunder Client (API testing)
  - MongoDB for VS Code

### Environment Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd hrms
   ```

2. **Install Dependencies**
   ```bash
   # Backend dependencies
   cd backend
   pnpm install

   # Frontend dependencies  
   cd ../frontend
   pnpm install
   ```

3. **Environment Variables**

   **Backend** (`backend/.env`):
   ```env
   # Server Configuration
   PORT=4000
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/hrms_dev
   # OR for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hrms_dev

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d

   # AWS S3 (File Storage)
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=hrms-documents-dev

   # Email Service (Resend)
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
   SENDER_EMAIL=noreply@yourcompany.com

   # OpenAI (Chatbot - Optional)
   OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx

   # Push Notifications (Optional)
   VAPID_PUBLIC_KEY=your_vapid_public_key
   VAPID_PRIVATE_KEY=your_vapid_private_key
   ```

   **Frontend** (`frontend/.env`):
   ```env
   # API Configuration
   VITE_API_URL=http://localhost:4000/api
   VITE_APP_NAME=HRMS Dev
   VITE_APP_VERSION=1.0.0

   # Feature Flags
   VITE_ENABLE_NOTIFICATIONS=true
   VITE_ENABLE_LOCATION_TRACKING=true
   VITE_ENABLE_CHATBOT=true
   ```

4. **Start Development Servers**

   **Terminal 1 (Backend):**
   ```bash
   cd backend
   pnpm dev
   # Server starts at http://localhost:4000
   ```

   **Terminal 2 (Frontend):**
   ```bash
   cd frontend  
   pnpm dev
   # Client starts at http://localhost:5173
   ```

5. **Verify Setup**
   - Visit `http://localhost:5173` for frontend
   - API health check: `http://localhost:4000/health`
   - MongoDB connection should show in backend logs

---

## 🏗️ Project Structure Deep Dive

### Backend Structure

```
backend/
├── controllers/          # Request handlers
│   ├── auth.controllers.js
│   ├── employee.controllers.js
│   ├── attendance.controllers.js
│   ├── leave.controllers.js
│   ├── salary.controllers.js
│   └── dashboard.controllers.js
├── models/               # MongoDB schemas
│   ├── User.model.js
│   ├── Employee.model.js
│   ├── Attendance.model.js
│   ├── Leave.model.js
│   └── SalaryStructure.model.js
├── routes/               # API endpoints
│   ├── auth.js
│   ├── employee.js
│   ├── attendance.js
│   └── leave.js
├── middlewares/          # Express middlewares
│   ├── auth.middleware.js
│   ├── role.middleware.js
│   └── validation.middleware.js
├── services/             # Business logic
│   ├── emailService.js
│   ├── attendanceService.js
│   ├── salaryService.js
│   └── notificationService.js
├── utils/                # Helper functions
│   ├── response.js       # Standardized responses
│   ├── errorHandler.js   # Error handling
│   ├── pdfGenerator.js   # PDF generation
│   └── dateUtils.js      # Date manipulation
├── validators/           # Input validation
│   ├── employee.validator.js
│   └── attendance.validator.js
└── server.js             # Entry point
```

### Frontend Structure

```
frontend/src/
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   ├── DataTable.jsx
│   │   └── FormField.jsx
│   ├── dashboard/        # Dashboard components
│   │   ├── AdminDashboard.jsx
│   │   ├── EmployeeDashboard.jsx
│   │   ├── MetricsCard.jsx
│   │   └── RecentActivities.jsx
│   ├── employee/         # Employee management
│   │   ├── EmployeeList.jsx
│   │   ├── EmployeeForm.jsx
│   │   ├── EmployeeCard.jsx
│   │   └── EmployeeProfile.jsx
│   ├── hr/               # HR specific features
│   │   ├── LeaveApproval.jsx
│   │   ├── AttendanceReport.jsx
│   │   ├── SalaryManagement.jsx
│   │   └── PolicyManager.jsx
│   └── common/           # Shared components
│       ├── Header.jsx
│       ├── Sidebar.jsx
│       ├── Layout.jsx
│       └── LoadingSpinner.jsx
├── contexts/             # React contexts
│   ├── AuthContext.jsx
│   ├── ThemeContext.jsx
│   └── NotificationContext.jsx
├── hooks/                # Custom hooks
│   ├── useAuth.js
│   ├── useEmployees.js
│   ├── useAttendance.js
│   └── useLocalStorage.js
├── lib/                  # Configuration & utilities
│   ├── api.js           # Axios configuration
│   ├── utils.js         # Helper functions
│   └── constants.js     # App constants
├── pages/                # Route components
│   ├── Dashboard.jsx
│   ├── Employees.jsx
│   ├── Attendance.jsx
│   ├── Leaves.jsx
│   └── Login.jsx
├── services/             # API services
│   ├── authService.js
│   ├── employeeService.js
│   ├── attendanceService.js
│   └── apiValidator.js  # Legacy API client
└── utils/                # Utility functions
    ├── dateUtils.js
    ├── formatters.js
    └── validators.js
```

---

## 💻 Development Workflow

### Git Workflow

**Branch Strategy:**
```
main                    # Production-ready code
├── develop            # Integration branch
├── feature/user-auth  # Feature branches
├── feature/attendance
├── hotfix/login-bug   # Hotfix branches
└── release/v1.1       # Release branches
```

**Commit Message Convention:**
```bash
# Format: type(scope): description
feat(auth): add JWT token refresh functionality
fix(attendance): resolve timezone calculation bug
docs(api): update endpoint documentation
style(ui): improve button component styling
refactor(salary): optimize tax calculation logic
test(employee): add unit tests for validation
chore(deps): update dependencies to latest versions
```

**Development Process:**
1. **Create Branch:** `git checkout -b feature/your-feature-name`
2. **Make Changes:** Follow coding standards
3. **Test Thoroughly:** Run tests and manual testing
4. **Commit Changes:** Use conventional commit messages
5. **Push Branch:** `git push origin feature/your-feature-name`
6. **Create PR:** Use provided PR template
7. **Code Review:** Address feedback promptly
8. **Merge:** After approval and CI passes

### Code Review Process

**Before Creating PR:**
```bash
# Backend checks
cd backend
pnpm lint                    # Check for linting errors
pnpm build                   # Verify build succeeds
pnpm test                    # Run all tests (when available)

# Frontend checks
cd frontend
pnpm lint                    # ESLint check
pnpm build                   # Production build test
pnpm type-check              # TypeScript check
```

**PR Requirements:**
- [ ] Code follows project conventions
- [ ] All tests pass
- [ ] No console errors or warnings
- [ ] Responsive design verified
- [ ] Documentation updated (if needed)
- [ ] No breaking changes (or documented)

**Review Checklist:**
- Code quality and readability
- Security implications
- Performance impact
- Error handling
- Test coverage
- Documentation accuracy

---

## 🧩 Architecture Patterns

### Backend Patterns

#### 1. Controller Pattern
```javascript
// Standard controller structure
const getEmployees = asyncHandler(async (req, res) => {
  // 1. Extract and validate input
  const { page = 1, limit = 20, search, department } = req.query;
  
  // 2. Build query
  const filter = { isActive: true };
  if (search) filter.name = { $regex: search, $options: 'i' };
  if (department) filter.department = department;
  
  // 3. Execute database operation
  const employees = await Employee.find(filter)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ name: 1 });
    
  const total = await Employee.countDocuments(filter);
  
  // 4. Format response
  res.success({
    employees,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  }, 'Employees fetched successfully');
});
```

#### 2. Service Layer Pattern
```javascript
// Business logic in service layer
class AttendanceService {
  static async processCheckIn(user, checkInData) {
    const employee = await Employee.findOne({ linkedUser: user._id });
    if (!employee) throw new NotFoundError('Employee record not found');
    
    const today = moment().format('YYYY-MM-DD');
    
    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employeeId: employee._id,
      date: today
    });
    
    if (existingAttendance && existingAttendance.checkInTime) {
      throw new ValidationError('Already checked in for today');
    }
    
    // Calculate status based on check-in time
    const checkInTime = checkInData.checkInTime || new Date();
    const status = this.calculateAttendanceStatus(checkInTime);
    
    // Create or update attendance record
    const attendance = await Attendance.findOneAndUpdate(
      { employeeId: employee._id, date: today },
      {
        checkInTime,
        status,
        location: checkInData.location
      },
      { upsert: true, new: true }
    );
    
    // Send notifications
    await NotificationService.sendCheckInNotification(employee, attendance);
    
    return attendance;
  }
  
  static calculateAttendanceStatus(checkInTime) {
    const cutoffTime = moment().set({ hour: 9, minute: 55 });
    return moment(checkInTime).isAfter(cutoffTime) ? 'late' : 'present';
  }
}
```

#### 3. Middleware Pattern
```javascript
// Role-based authorization middleware
const authorize = (roles = []) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.unauthorized('Access denied. Authentication required.');
      }
      
      // Check if user has required role
      if (roles.length && !roles.includes(req.user.role)) {
        return res.forbidden('Access denied. Insufficient permissions.');
      }
      
      next();
    } catch (error) {
      res.serverError('Authorization error', error);
    }
  };
};

// Usage in routes
router.get('/employees', authenticate, authorize(['admin', 'hr']), getEmployees);
```

### Frontend Patterns

#### 1. Custom Hooks Pattern
```javascript
// Custom hook for employee data using current API client
export const useEmployees = (filters = {}) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getEmployees(filters);
      setEmployees(data.employees || []);
    } catch (err) {
      setError(err);
      toast.error('Failed to fetch employees');
      console.error('Employee fetch error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchEmployees();
  }, [JSON.stringify(filters)]);
  
  return { 
    employees, 
    loading, 
    error, 
    refetch: fetchEmployees 
  };
};

// Usage in component
const EmployeeList = () => {
  const [filters, setFilters] = useState({ department: '', search: '' });
  const { employees, loading, error, refetch } = useEmployees(filters);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={refetch} />;
  
  return (
    <div>
      <EmployeeFilters onFilterChange={setFilters} />
      <EmployeeTable employees={employees} />
    </div>
  );
};
```

#### 2. Compound Component Pattern
```javascript
// Reusable card component with compound pattern
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow ${className}`}>
    {children}
  </div>
);

Card.Header = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b ${className}`}>
    {children}
  </div>
);

Card.Body = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

Card.Footer = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-t bg-gray-50 ${className}`}>
    {children}
  </div>
);

// Usage
const EmployeeCard = ({ employee }) => (
  <Card>
    <Card.Header>
      <h3 className="font-semibold">{employee.name}</h3>
    </Card.Header>
    <Card.Body>
      <p>{employee.designation}</p>
      <p>{employee.department}</p>
    </Card.Body>
    <Card.Footer>
      <Button onClick={() => viewEmployee(employee.id)}>
        View Details
      </Button>
    </Card.Footer>
  </Card>
);
```

#### 3. Form Handling Pattern
```javascript
// Form with React Hook Form + Zod validation
const employeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  department: z.string().min(1, 'Department is required')
});

const EmployeeForm = ({ employee, onSubmit, onCancel }) => {
  const form = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: employee || {
      name: '',
      email: '',
      phone: '',
      department: ''
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data) => {
    try {
      setIsLoading(true);
      let result;
      
      if (employee) {
        result = await apiClient.updateEmployee(employee.id, data);
      } else {
        result = await apiClient.createEmployee(data);
      }
      
      toast.success(`Employee ${employee ? 'updated' : 'created'} successfully`);
      onSubmit(result);
    } catch (error) {
      toast.error(`Failed to ${employee ? 'update' : 'create'} employee`);
      console.error('Employee save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <FormField
        label="Name"
        error={form.formState.errors.name?.message}
        required
      >
        <Input
          {...form.register('name')}
          placeholder="Enter full name"
        />
      </FormField>

      <FormField
        label="Email"
        error={form.formState.errors.email?.message}
        required
      >
        <Input
          type="email"
          {...form.register('email')}
          placeholder="Enter email address"
        />
      </FormField>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          {employee ? 'Update' : 'Create'} Employee
        </Button>
      </div>
    </form>
  );
};
```

---

## 🗄️ Database Development

### MongoDB Schema Design

#### Model Definition Pattern
```javascript
// Employee model with comprehensive schema
const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Invalid email format']
  },
  phone: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: 'Phone number must be exactly 10 digits'
    }
  },
  // Nested schemas for complex data
  personalDetails: {
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    address: {
      street: String,
      city: String,
      state: String,
      pinCode: String,
      country: { type: String, default: 'India' }
    }
  },
  // References to other collections
  linkedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Audit fields
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  toJSON: { virtuals: true }, // Include virtuals in JSON output
  toObject: { virtuals: true }
});

// Indexes for performance
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ email: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ isActive: 1, createdAt: -1 });

// Virtual fields
employeeSchema.virtual('fullAddress').get(function() {
  const addr = this.personalDetails.address;
  if (!addr) return '';
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.pinCode}`;
});

// Pre-save middleware
employeeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance methods
employeeSchema.methods.getBasicInfo = function() {
  return {
    id: this._id,
    employeeId: this.employeeId,
    name: this.name,
    email: this.email,
    department: this.department,
    designation: this.designation
  };
};

// Static methods
employeeSchema.statics.findByDepartment = function(department) {
  return this.find({ department, isActive: true }).sort({ name: 1 });
};

module.exports = mongoose.model('Employee', employeeSchema);
```

#### Query Optimization
```javascript
// Efficient queries with proper indexing and population
class EmployeeRepository {
  // Paginated query with search and filters
  static async findEmployees(filters, pagination) {
    const { search, department, status } = filters;
    const { page = 1, limit = 20 } = pagination;
    
    // Build query object
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (department) query.department = department;
    if (status !== undefined) query.isActive = status;
    
    // Execute query with population and projection
    const employees = await Employee
      .find(query)
      .select('name email employeeId department designation isActive createdAt')
      .populate('linkedUser', 'role lastLogin')
      .sort({ name: 1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean(); // Use lean() for better performance when no mongoose features needed
      
    const total = await Employee.countDocuments(query);
    
    return {
      employees,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }
  
  // Aggregation pipeline for complex queries
  static async getEmployeeStats() {
    return await Employee.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          avgSalary: { $avg: '$salary' },
          employees: {
            $push: {
              name: '$name',
              designation: '$designation'
            }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
  }
}
```

### Database Migration Scripts

```javascript
// Migration script for data type changes
const migratePhoneAndAadhaar = async () => {
  console.log('Starting phone and Aadhaar migration...');
  
  try {
    // Find all employees with numeric phone/aadhaar
    const employees = await Employee.find({
      $or: [
        { phone: { $type: 'number' } },
        { aadhaarNumber: { $type: 'number' } }
      ]
    });
    
    console.log(`Found ${employees.length} employees to migrate`);
    
    for (const employee of employees) {
      const updates = {};
      
      // Convert phone number to string with padding
      if (typeof employee.phone === 'number') {
        updates.phone = employee.phone.toString().padStart(10, '0');
      }
      
      // Convert Aadhaar number to string with padding
      if (typeof employee.aadhaarNumber === 'number') {
        updates.aadhaarNumber = employee.aadhaarNumber.toString().padStart(12, '0');
      }
      
      if (Object.keys(updates).length > 0) {
        await Employee.updateOne({ _id: employee._id }, updates);
        console.log(`Updated employee ${employee.employeeId}`);
      }
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

// Run migration
migratePhoneAndAadhaar();
```

---

## 🧪 Testing Strategy

### Unit Testing (Backend)

```javascript
// Test example for attendance service
const AttendanceService = require('../services/attendanceService');
const Employee = require('../models/Employee.model');
const Attendance = require('../models/Attendance.model');

describe('AttendanceService', () => {
  let mockEmployee;
  
  beforeEach(() => {
    mockEmployee = {
      _id: 'employee_id',
      employeeId: 'EMP001',
      name: 'John Doe'
    };
    
    jest.clearAllMocks();
  });
  
  describe('processCheckIn', () => {
    it('should create attendance record for valid check-in', async () => {
      // Arrange
      Employee.findOne = jest.fn().mockResolvedValue(mockEmployee);
      Attendance.findOne = jest.fn().mockResolvedValue(null);
      Attendance.findOneAndUpdate = jest.fn().mockResolvedValue({
        employeeId: mockEmployee._id,
        date: '2024-01-15',
        checkInTime: new Date('2024-01-15T09:30:00'),
        status: 'present'
      });
      
      const checkInData = {
        checkInTime: new Date('2024-01-15T09:30:00'),
        location: { latitude: 12.9716, longitude: 77.5946 }
      };
      
      // Act
      const result = await AttendanceService.processCheckIn(
        { _id: 'user_id' }, 
        checkInData
      );
      
      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('present');
      expect(Employee.findOne).toHaveBeenCalledWith({ linkedUser: 'user_id' });
      expect(Attendance.findOneAndUpdate).toHaveBeenCalled();
    });
    
    it('should throw error for duplicate check-in', async () => {
      // Arrange
      Employee.findOne = jest.fn().mockResolvedValue(mockEmployee);
      Attendance.findOne = jest.fn().mockResolvedValue({
        checkInTime: new Date()
      });
      
      // Act & Assert
      await expect(
        AttendanceService.processCheckIn({ _id: 'user_id' }, {})
      ).rejects.toThrow('Already checked in for today');
    });
  });
});
```

### Integration Testing (API)

```javascript
// API integration tests
const request = require('supertest');
const app = require('../server');
const User = require('../models/User.model');
const Employee = require('../models/Employee.model');

describe('Employee API', () => {
  let authToken;
  let adminUser;
  
  beforeAll(async () => {
    // Setup test database
    await connectTestDB();
    
    // Create admin user
    adminUser = await User.create({
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin'
    });
    
    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });
      
    authToken = loginResponse.body.data.token;
  });
  
  afterAll(async () => {
    await clearTestDB();
    await disconnectTestDB();
  });
  
  describe('POST /api/employees/create', () => {
    it('should create employee with valid data', async () => {
      const employeeData = {
        name: 'Jane Smith',
        email: 'jane@test.com',
        phone: '9876543210',
        aadhaarNumber: '123456789012',
        department: 'IT',
        designation: 'Developer',
        salary: 50000
      };
      
      const response = await request(app)
        .post('/api/employees/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(employeeData)
        .expect(201);
        
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Jane Smith');
      expect(response.body.data.employeeId).toBeDefined();
    });
    
    it('should reject invalid phone number', async () => {
      const employeeData = {
        name: 'Invalid Phone User',
        email: 'invalid@test.com',
        phone: '123', // Invalid phone
        aadhaarNumber: '123456789012'
      };
      
      const response = await request(app)
        .post('/api/employees/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(employeeData)
        .expect(400);
        
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('phone');
    });
  });
});
```

### Frontend Testing

```javascript
// Component testing with React Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmployeeList from '../components/employee/EmployeeList';
import * as employeeService from '../services/employeeService';

// Mock the service
jest.mock('../services/employeeService');

describe('EmployeeList Component', () => {
  let queryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });
  
  const renderWithProviders = (component) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };
  
  it('should display employee list', async () => {
    // Arrange
    const mockEmployees = [
      { id: '1', name: 'John Doe', department: 'IT' },
      { id: '2', name: 'Jane Smith', department: 'HR' }
    ];
    
    employeeService.getEmployees.mockResolvedValue({
      employees: mockEmployees,
      pagination: { totalItems: 2 }
    });
    
    // Act
    renderWithProviders(<EmployeeList />);
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });
  
  it('should filter employees by department', async () => {
    // Implementation for filter testing
  });
});
```

---

## 🎨 UI/UX Development

### Component Development Guidelines

#### 1. Reusable UI Components

```javascript
// Button component with variants
const Button = forwardRef(({
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  const classes = cn(
    baseClasses,
    variants[variant],
    sizes[size],
    {
      'opacity-50 cursor-not-allowed': disabled || loading,
      'cursor-wait': loading
    },
    className
  );
  
  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
      )}
      {children}
    </button>
  );
});
```

#### 2. Form Components

```javascript
// FormField wrapper component
const FormField = ({ label, error, required, className = '', children }) => (
  <div className={`space-y-1 ${className}`}>
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    )}
    {children}
    {error && (
      <p className="text-sm text-red-600">{error}</p>
    )}
  </div>
);

// Input component
const Input = forwardRef(({
  className = '',
  type = 'text',
  error,
  ...props
}, ref) => {
  const baseClasses = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm';
  const errorClasses = 'border-red-300 focus:border-red-500 focus:ring-red-500';
  
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        baseClasses,
        error ? errorClasses : '',
        className
      )}
      {...props}
    />
  );
});
```

### Responsive Design Patterns

```css
/* Mobile-first responsive design */
.container {
  /* Mobile (default) */
  padding: 1rem;
  
  /* Tablet */
  @media (min-width: 768px) {
    padding: 2rem;
  }
  
  /* Desktop */
  @media (min-width: 1024px) {
    padding: 3rem;
    max-width: 1200px;
    margin: 0 auto;
  }
}

/* Grid layouts */
.employee-grid {
  display: grid;
  gap: 1rem;
  
  /* Mobile: 1 column */
  grid-template-columns: 1fr;
  
  /* Tablet: 2 columns */
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  /* Desktop: 3 columns */
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Touch-friendly design */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem;
}

.mobile-table {
  /* Hide table on mobile, show card layout */
  @media (max-width: 767px) {
    display: none;
  }
}

.mobile-cards {
  display: none;
  
  @media (max-width: 767px) {
    display: block;
  }
}
```

### Accessibility Guidelines

```javascript
// Accessible modal component
const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      // Trap focus within modal
      document.body.style.overflow = 'hidden';
      
      // Focus first focusable element
      const focusableElements = modal.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length) {
        focusableElements[0].focus();
      }
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
        
        <div 
          ref={modal}
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full"
        >
          <div className="px-6 py-4 border-b">
            <h2 id="modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 🚀 Performance Optimization

### Frontend Performance

#### 1. Code Splitting and Lazy Loading

```javascript
// Route-based code splitting
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Employees = lazy(() => import('../pages/Employees'));
const Attendance = lazy(() => import('../pages/Attendance'));

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dashboard" element={
          <Suspense fallback={<LoadingSpinner />}>
            <Dashboard />
          </Suspense>
        } />
        <Route path="/employees" element={
          <Suspense fallback={<LoadingSpinner />}>
            <Employees />
          </Suspense>
        } />
      </Routes>
    </Router>
  );
}
```

#### 2. React Query Optimization

```javascript
// Optimized query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      }
    }
  }
});

// Prefetch related data
const useEmployeeDetails = (employeeId) => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeeService.getEmployee(employeeId),
    onSuccess: (employee) => {
      // Prefetch related data
      queryClient.prefetchQuery({
        queryKey: ['attendance', employeeId],
        queryFn: () => attendanceService.getAttendance(employeeId)
      });
    }
  });
};
```

#### 3. Component Optimization

```javascript
// Memoized components to prevent unnecessary re-renders
const EmployeeCard = memo(({ employee, onClick }) => {
  return (
    <div 
      className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(employee.id)}
    >
      <h3 className="font-semibold">{employee.name}</h3>
      <p className="text-gray-600">{employee.designation}</p>
      <p className="text-sm text-gray-500">{employee.department}</p>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.employee.id === nextProps.employee.id &&
         prevProps.employee.name === nextProps.employee.name;
});

// Virtualized lists for large datasets
import { FixedSizeList as List } from 'react-window';

const VirtualizedEmployeeList = ({ employees }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <EmployeeCard employee={employees[index]} />
    </div>
  );
  
  return (
    <List
      height={600}
      itemCount={employees.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

### Backend Performance

#### 1. Database Query Optimization

```javascript
// Efficient pagination with cursor-based approach for large datasets
class EmployeeService {
  static async getEmployeesPaginated(lastId = null, limit = 20, filters = {}) {
    const query = { isActive: true };
    
    // Apply filters
    if (filters.department) query.department = filters.department;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { employeeId: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    // Cursor-based pagination
    if (lastId) {
      query._id = { $gt: lastId };
    }
    
    const employees = await Employee
      .find(query)
      .select('name email employeeId department designation')
      .sort({ _id: 1 })
      .limit(limit + 1) // Fetch one extra to check if there are more
      .lean();
      
    const hasMore = employees.length > limit;
    if (hasMore) employees.pop(); // Remove the extra item
    
    return {
      employees,
      hasMore,
      lastId: employees.length > 0 ? employees[employees.length - 1]._id : null
    };
  }
}
```

#### 2. Caching Strategy

```javascript
// Simple in-memory cache implementation
class CacheService {
  static cache = new Map();
  static ttl = new Map();
  
  static set(key, value, ttlMs = 300000) { // 5 minutes default
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
  }
  
  static get(key) {
    const expiry = this.ttl.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }
  
  static clear() {
    this.cache.clear();
    this.ttl.clear();
  }
}

// Usage in controllers
const getDashboardStats = asyncHandler(async (req, res) => {
  const cacheKey = `dashboard_stats_${req.user.role}`;
  let stats = CacheService.get(cacheKey);
  
  if (!stats) {
    stats = await DashboardService.calculateStats(req.user);
    CacheService.set(cacheKey, stats, 5 * 60 * 1000); // Cache for 5 minutes
  }
  
  res.success(stats, 'Dashboard stats fetched successfully');
});
```

---

## 🐛 Debugging & Troubleshooting

### Development Debugging

#### Backend Debugging

```javascript
// Structured logging for better debugging
const logger = require('./utils/logger');

// In controllers
const createEmployee = asyncHandler(async (req, res) => {
  try {
    logger.info('Creating employee', {
      userId: req.user.id,
      employeeData: req.body,
      timestamp: new Date().toISOString()
    });
    
    const employee = await EmployeeService.createEmployee(req.body);
    
    logger.info('Employee created successfully', {
      employeeId: employee.employeeId,
      createdBy: req.user.id
    });
    
    res.success(employee, 'Employee created successfully');
  } catch (error) {
    logger.error('Employee creation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
      employeeData: req.body
    });
    
    throw error;
  }
});
```

#### Frontend Debugging

```javascript
// Development-only debugging utilities
const isDevelopment = process.env.NODE_ENV === 'development';

export const debugLog = (label, data) => {
  if (isDevelopment) {
    console.group(`🐛 ${label}`);
    console.log(data);
    console.trace();
    console.groupEnd();
  }
};

// React Query debugging
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        debugLog('Query Error', error);
      },
      onSuccess: (data, query) => {
        debugLog('Query Success', { query: query.queryKey, data });
      }
    }
  }
});

// Performance monitoring
export const usePerformanceMonitor = (componentName) => {
  useEffect(() => {
    if (isDevelopment) {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        console.log(`⏱️ ${componentName} render time: ${endTime - startTime}ms`);
      };
    }
  });
};
```

### Common Issues & Solutions

#### Database Connection Issues

```javascript
// Robust MongoDB connection with retry logic
const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      retries++;
      console.error(`❌ MongoDB connection attempt ${retries} failed:`, error.message);
      
      if (retries >= maxRetries) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
    }
  }
};
```

#### Memory Leak Prevention

```javascript
// Cleanup effects in React components
useEffect(() => {
  const controller = new AbortController();
  
  // API call with abort signal
  fetchData({ signal: controller.signal })
    .then(setData)
    .catch(error => {
      if (error.name !== 'AbortError') {
        setError(error);
      }
    });
  
  // Cleanup function
  return () => {
    controller.abort();
  };
}, []);

// Clear intervals and timeouts
useEffect(() => {
  const interval = setInterval(() => {
    // Polling logic
  }, 5000);
  
  return () => clearInterval(interval);
}, []);
```

---

## 📚 Resources & Learning

### Documentation Links

**Official Documentation:**
- [React](https://react.dev/) - Frontend framework
- [Node.js](https://nodejs.org/docs/) - Backend runtime
- [Express.js](https://expressjs.com/) - Web framework
- [MongoDB](https://docs.mongodb.com/) - Database
- [Mongoose](https://mongoosejs.com/docs/) - ODM
- [Custom API Client](./src/service/apiClient.js) - 775-line custom HTTP client
- [Tailwind CSS](https://tailwindcss.com/docs) - Styling
- [Vite](https://vitejs.dev/) - Build tool

**Libraries Used:**
- [React Hook Form](https://react-hook-form.com/) - Form handling
- [Zod](https://zod.dev/) - Schema validation
- [Recharts](https://recharts.org/) - Charts and graphs
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [Radix UI](https://www.radix-ui.com/) - UI primitives
- [jsPDF](https://github.com/parallax/jsPDF) - PDF generation
- [OpenAI](https://platform.openai.com/docs/) - AI chatbot integration
- [WhatsApp Web.js](https://github.com/pedroslopez/whatsapp-web.js/) - WhatsApp automation

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode", 
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "humao.rest-client",
    "mongodb.mongodb-vscode",
    "ms-vscode.vscode-json"
  ]
}
```

### Useful Development Tools

**API Testing:**
- Thunder Client (VS Code extension)
- Postman
- Insomnia

**Database Management:**
- MongoDB Compass
- Robo 3T
- MongoDB for VS Code

**Debugging:**
- React Developer Tools
- Redux DevTools (if used)
- Chrome DevTools

---

## 🤝 Contributing Guidelines

### Code Review Checklist

**Before Submitting PR:**
- [ ] Code follows project style guide
- [ ] All tests pass locally
- [ ] No console errors or warnings
- [ ] Mobile responsiveness verified
- [ ] Accessibility requirements met
- [ ] Performance impact assessed
- [ ] Documentation updated
- [ ] Security implications reviewed

**PR Description Template:**
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)  
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Mobile testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Code is commented, particularly in hard-to-understand areas
- [ ] Corresponding changes to documentation made
- [ ] No new warnings introduced
- [ ] Tests added that prove fix is effective or feature works
```

### Getting Help

**Development Support:**
- GitHub Issues for bug reports
- GitHub Discussions for questions
- Code review requests via PR
- Architecture decisions in team meetings

**Resources:**
- Project documentation in `/docs`
- Code examples in existing components
- CLAUDE.md for development patterns
- Team knowledge sharing sessions

---

*This development guide is a living document and will be updated as the project evolves. Always refer to the latest version in the repository.*

---

**Happy Coding! 🚀**

*Last Updated: January 2025*