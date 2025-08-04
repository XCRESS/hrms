/**
 * HR Authentication Middleware
 * Ensures only HR and Admin users can access HR-specific endpoints
 */

export const hrAuthMiddleware = (req, res, next) => {
  try {
    // Check if user is authenticated (should be handled by authenticateToken first)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    // Check if user has HR or Admin role
    const allowedRoles = ['hr', 'admin'];
    if (!req.user.role || !allowedRoles.includes(req.user.role.toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR or Admin role required.',
        code: 'INSUFFICIENT_PRIVILEGES',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    // Add HR context to request
    req.hrContext = {
      userId: req.user._id,
      role: req.user.role,
      permissions: getHRPermissions(req.user.role),
      accessLevel: req.user.role === 'admin' ? 'full' : 'hr'
    };

    next();
  } catch (error) {
    console.error('HR Auth Middleware Error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      code: 'AUTH_CHECK_FAILED'
    });
  }
};

/**
 * Get HR permissions based on role
 */
const getHRPermissions = (role) => {
  const permissions = {
    hr: [
      'view_all_attendance',
      'update_attendance',
      'export_attendance',
      'view_analytics',
      'bulk_operations_limited'
    ],
    admin: [
      'view_all_attendance',
      'update_attendance',
      'export_attendance',
      'view_analytics',
      'bulk_operations_full',
      'system_administration',
      'audit_access'
    ]
  };

  return permissions[role.toLowerCase()] || [];
};