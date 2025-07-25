"""
Task report-related functions for HR Buddy
"""
import logging
from utils import (
    format_date_for_api, 
    get_today_date, 
    safe_json_parse,
    handle_api_response
)

logger = logging.getLogger(__name__)

def get_team_task_reports_today(hrms):
    """Get all task reports for today (admin/hr only)"""
    try:
        params_dict = {"date": get_today_date()}
        response = hrms.get_all_task_reports(params_dict)
        return handle_api_response(response, "get_team_task_reports_today")
    except Exception as e:
        logger.error(f"get_team_task_reports_today error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve today's team task reports."}

def get_task_reports_by_employee(hrms, employee_name: str, date_str: str = None):
    """Get task reports for a specific employee (admin/hr only)"""
    try:
        params_dict = {"employeeName": employee_name}
        if date_str:
            params_dict["date"] = format_date_for_api(date_str)
        else:
            params_dict["date"] = get_today_date()
            
        response = hrms.get_all_task_reports(params_dict)
        return handle_api_response(response, "get_task_reports_by_employee")
    except Exception as e:
        logger.error(f"get_task_reports_by_employee error: {e}")
        return {"success": False, "error": str(e), "user_message": f"Unable to retrieve task reports for {employee_name}."}

def submit_task_report(hrms, data: str):
    """Submit task report with validation"""
    try:
        if not data or data.strip() == "":
            return {"success": False, "error": "No data provided", "user_message": "Task report data is required to submit a report."}
        
        data_dict = safe_json_parse(data)
        if not data_dict:
            return {"success": False, "error": "Invalid data format", "user_message": "The task report data format is invalid."}
        
        response = hrms.submit_task_report(data_dict)
        return handle_api_response(response, "submit_task_report")
    except Exception as e:
        logger.error(f"submit_task_report error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to submit task report."}