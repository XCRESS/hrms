"""
Combined attendance functions for today and yesterday
"""
import logging
from utils import (
    get_today_date,
    get_yesterday_date,
    handle_api_response,
    format_date_for_display
)

logger = logging.getLogger(__name__)

def get_attendance_today_and_yesterday(hrms):
    """Get attendance for today and yesterday for all employees"""
    try:
        today_date = get_today_date()
        yesterday_date = get_yesterday_date()
        
        # Get today's attendance
        today_response = hrms.get_today_attendance()
        today_result = handle_api_response(today_response, "get_today_attendance")
        
        # Get yesterday's attendance using admin range
        params_dict = {
            "startDate": yesterday_date,
            "endDate": yesterday_date
        }
        yesterday_response = hrms.get_admin_attendance_range(params_dict)
        yesterday_result = handle_api_response(yesterday_response, "get_yesterday_attendance")
        
        # Combine results
        combined_result = {
            "success": True,
            "data": {
                "today": {
                    "date": today_date,
                    "date_display": format_date_for_display(today_date),
                    "attendance": today_result.get("data", []) if today_result.get("success") else [],
                    "error": None if today_result.get("success") else today_result.get("user_message", "Failed to retrieve today's attendance")
                },
                "yesterday": {
                    "date": yesterday_date,
                    "date_display": format_date_for_display(yesterday_date),
                    "attendance": yesterday_result.get("data", []) if yesterday_result.get("success") else [],
                    "error": None if yesterday_result.get("success") else yesterday_result.get("user_message", "Failed to retrieve yesterday's attendance")
                }
            },
            "summary": f"Attendance data for {format_date_for_display(today_date)} (Today) and {format_date_for_display(yesterday_date)} (Yesterday)"
        }
        
        return combined_result
        
    except Exception as e:
        logger.error(f"get_attendance_today_and_yesterday error: {e}")
        return {
            "success": False, 
            "error": str(e), 
            "user_message": "Unable to retrieve attendance data for today and yesterday. Please try again or contact support."
        }

def get_team_attendance_yesterday(hrms):
    """Get yesterday's attendance for all employees"""
    try:
        yesterday_date = get_yesterday_date()
        params_dict = {
            "startDate": yesterday_date,
            "endDate": yesterday_date
        }
        
        response = hrms.get_admin_attendance_range(params_dict)
        result = handle_api_response(response, "get_team_attendance_yesterday")
        
        # Add context
        if result.get("success") and result.get("data"):
            result["date_context"] = f"Data for {format_date_for_display(yesterday_date)} (Yesterday)"
        
        return result
    except Exception as e:
        logger.error(f"get_team_attendance_yesterday error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve yesterday's attendance data."}