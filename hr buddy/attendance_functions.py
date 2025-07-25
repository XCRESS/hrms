"""
Attendance-related functions for HR Buddy
"""
import logging
from datetime import datetime, timedelta
from utils import (
    format_date_for_api, 
    format_date_for_display,
    get_today_date, 
    get_yesterday_date, 
    get_ist_now,
    safe_json_parse,
    handle_api_response
)

logger = logging.getLogger(__name__)

def get_attendance_by_employee_name(hrms, employee_name: str, date_str: str = None):
    """Get attendance for a specific employee (admin/hr only)"""
    try:
        params_dict = {"employeeName": employee_name}
        if date_str:
            params_dict["date"] = format_date_for_api(date_str)
        else:
            params_dict["date"] = get_today_date()
            
        response = hrms.get_admin_attendance_range(params_dict)
        result = handle_api_response(response, "get_attendance_by_employee_name")
        return result
    except Exception as e:
        logger.error(f"get_attendance_by_employee_name error: {e}")
        return {"success": False, "error": str(e), "user_message": f"Unable to retrieve attendance for {employee_name}."}

def get_team_attendance_today(hrms):
    """Get today's attendance for all employees (admin/hr only)"""
    try:
        response = hrms.get_today_attendance()
        result = handle_api_response(response, "get_team_attendance_today")
        return result
    except Exception as e:
        logger.error(f"get_team_attendance_today error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve team attendance for today."}

def get_today_attendance(hrms):
    """Get today's attendance for all employees"""
    try:
        response = hrms.get_today_attendance()
        result = handle_api_response(response, "get_today_attendance")
        
        # Add date context
        if result.get("success") and result.get("data"):
            result["date_context"] = f"Data for {format_date_for_display(get_today_date())}"
        
        return result
    except Exception as e:
        logger.error(f"get_today_attendance error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve today's attendance data."}

def get_admin_attendance_range(hrms, params: str = None):
    """Get attendance range with date validation"""
    try:
        params_dict = safe_json_parse(params, {})
        
        # Validate date parameters
        if 'startDate' in params_dict:
            params_dict['startDate'] = format_date_for_api(params_dict['startDate'])
        if 'endDate' in params_dict:
            params_dict['endDate'] = format_date_for_api(params_dict['endDate'])
        
        response = hrms.get_admin_attendance_range(params_dict)
        result = handle_api_response(response, "get_admin_attendance_range")
        
        # Add date context
        if result.get("success") and result.get("data"):
            if 'startDate' in params_dict and 'endDate' in params_dict:
                start_display = format_date_for_display(params_dict['startDate'])
                end_display = format_date_for_display(params_dict['endDate'])
                result["date_context"] = f"Data from {start_display} to {end_display}"
        
        return result
    except Exception as e:
        logger.error(f"get_admin_attendance_range error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve attendance range data."}

def checkin_attendance(hrms, data: str = None):
    """Check in with validation"""
    try:
        data_dict = safe_json_parse(data, {})
        response = hrms.checkin(data_dict)
        return handle_api_response(response, "checkin_attendance")
    except Exception as e:
        logger.error(f"checkin_attendance error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to process check-in request."}

def checkout_attendance(hrms, data: str = None):
    """Check out with validation"""
    try:
        data_dict = safe_json_parse(data, {})
        response = hrms.checkout(data_dict)
        return handle_api_response(response, "checkout_attendance")
    except Exception as e:
        logger.error(f"checkout_attendance error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to process check-out request."}

def get_missing_checkouts(hrms):
    """Get missing checkouts"""
    try:
        response = hrms.get_missing_checkouts()
        return handle_api_response(response, "get_missing_checkouts")
    except Exception as e:
        logger.error(f"get_missing_checkouts error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve missing checkout information."}