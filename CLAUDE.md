# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Node.js/Express)
```bash
cd backend
pnpm install
pnpm start          # Production server
pnpm dev            # Development with nodemon

# Stop server (find process and kill by PID)
taskkill //F //PID <specific_pid>
```

### Frontend (React/Vite)
```bash
cd frontend
pnpm install
pnpm dev            # Development server
pnpm build          # Production build
pnpm preview        # Preview production build
pnpm lint           # ESLint
```

## Development Workflow Patterns

### Package Management
- **Recommendation**: Use pnpm instead of npm for faster and more efficient package management
- Ensures consistent dependency installation across different development environments
- Provides better disk space efficiency through hard-linking

## Architecture Overview

### Authentication & Authorization System
- **JWT-based authentication** with tokens stored in localStorage and cookies
- **Role-based access control**: admin, hr, employee roles with hierarchical permissions
- **Dual-model approach**: `User` model for auth, `Employee` model for HR data
- **Middleware chain**: `auth.middlewares.js` provides role-based route protection
- **Frontend guards**: Components conditionally render based on user role via `getProfile` context

### User-Employee Relationship
- Users authenticate and get assigned roles
- Employees contain detailed HR information (personal, professional, banking)
- **Linking system**: `linkuser.js` connects User accounts to Employee records
- Admin/HR can manage all employees; employees access only their own data

### Attendance & Leave Integration
- **Automatic status detection**: Late (after 9:55 AM), Half-day (<4 hours), Present, Absent
- **Working day calculation**: Excludes weekends and holidays from attendance requirements
- **Leave integration**: Approved leaves automatically mark attendance as present
- **Real-time updates**: Dashboard shows current attendance status and pending actions

### Salary Processing Architecture
- **Multi-component system**:
  - `SalaryStructure` defines earning components and amounts (independent management)
  - `SalarySlip` generates monthly slips with automatic calculations
  - Tax calculation supporting both old and new Indian tax regimes
  - **Publish/Unpublish system**: Draft → Published workflow for employee access
- **PDF generation**: Custom utility in `pdfGenerator.js` for salary slip downloads
- **Bulk processing**: HR can generate salary slips for all employees at once
- **Employee access**: Dedicated `/salary-slips/my` page for employees to view published slips

### API Structure & Patterns
- **RESTful design** with consistent response format via `utils/response.js`
- **Middleware chains**: Authentication → Role validation → Controller
- **Error handling**: Centralized error responses with proper HTTP status codes
- **Route organization**: Feature-based routing (e.g., `/api/employees`, `/api/attendance`)

### Frontend Architecture
- **Component structure**: Feature-based organization under `src/components/`
- **Role-based rendering**: Components check user role for conditional UI
- **Centralized API client**: `service/apiValidator.js` handles all backend communication
- **State management**: Context providers for theme and user profile
- **UI components**: Reusable components in `components/ui/` using Radix UI + Tailwind

## Key Configuration Files

- **Backend**: `package.json` defines Node.js dependencies and scripts
- **Frontend**: `vite.config.js` configures build tool and dev server
- **Styling**: `tailwind.config.js` with custom theme configuration
- **PWA**: `public/manifest.json` and `public/sw.js` for Progressive Web App features
- **Database**: Mongoose models in `backend/models/` define data schemas

## Development Workflow Patterns

### Adding New Features
1. **Backend**: Create model → Controller → Route → Test with existing middleware
2. **Frontend**: Create component → Add to routing → Integrate with API client
3. **Role-based access**: Update `auth.middlewares.js` and component role checks

### Database Operations
- Use existing Mongoose models as templates
- Follow established schema patterns (createdAt, updatedAt, soft deletes)
- Maintain referential integrity between User and Employee collections

### Component Development
- Follow existing patterns in `components/dashboard/`, `components/hr/`, `components/employee/`
- Use shared UI components from `components/ui/`
- Implement role-based conditional rendering
- Handle loading states and error boundaries

### API Integration
- Use `apiValidator.js` for consistent API calls
- Follow established error handling patterns
- Implement proper loading states in components
- Handle authentication token refresh as needed

### Code Quality & Testing
- **IMPORTANT**: Always run lint checks after coding changes: `pnpm lint`
- Fix all ESLint errors and warnings before considering code complete
- Frontend uses ESLint for code quality and consistency
- Address React-specific warnings (e.g., multiple createRoot calls, unused variables)

## Important Implementation Details

### Attendance Status Logic
- Check-in before 9:55 AM = Present
- Check-in after 9:55 AM = Late  
- Work hours < 4 = Half-day
- No check-in = Absent (unless on approved leave)

### Salary Calculation
- Support for both old and new Indian tax regimes
- Automatic TDS calculation based on salary structure
- Monthly slip generation with detailed earnings breakdown
- PDF export functionality for employee records

### Role Permissions
- **Admin**: Full system access including user management, salary structures, salary slips
- **HR**: Employee management, attendance oversight, salary structure and slip management, publish/unpublish
- **Employee**: Personal data access only (attendance, leave, published salary slips)

### Data Flow Patterns
- Frontend → API Client → Backend Routes → Controllers → Models → Database
- Authentication headers automatically added to requests
- Consistent error handling across all API endpoints
- Real-time updates reflected in dashboard components