"""
Leave and regularization-related functions for HR Buddy
"""
import logging
from utils import safe_json_parse, handle_api_response

logger = logging.getLogger(__name__)

def get_team_pending_leave_requests(hrms):
    """Get all pending leave requests for the team (admin/hr only)"""
    try:
        params_dict = {"status": "pending"}
        response = hrms.get_all_leaves(params_dict)
        return handle_api_response(response, "get_team_pending_leave_requests")
    except Exception as e:
        logger.error(f"get_team_pending_leave_requests error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve pending leave requests."}

def get_leave_requests_by_employee(hrms, employee_name: str):
    """Get leave requests for a specific employee (admin/hr only)"""
    try:
        params_dict = {"employeeName": employee_name}
        response = hrms.get_all_leaves(params_dict)
        return handle_api_response(response, "get_leave_requests_by_employee")
    except Exception as e:
        logger.error(f"get_leave_requests_by_employee error: {e}")
        return {"success": False, "error": str(e), "user_message": f"Unable to retrieve leave requests for {employee_name}."}

def request_leave(hrms, data: str):
    """Request leave with validation"""
    try:
        if not data or data.strip() == "":
            return {"success": False, "error": "No data provided", "user_message": "Leave request data is required."}
        
        data_dict = safe_json_parse(data)
        if not data_dict:
            return {"success": False, "error": "Invalid data format", "user_message": "The leave request data format is invalid."}
        
        # Validate required fields
        required_fields = ['startDate', 'endDate', 'reason']
        missing_fields = [field for field in required_fields if field not in data_dict]
        if missing_fields:
            return {"success": False, "error": f"Missing required fields: {missing_fields}", "user_message": f"Please provide the required information: {', '.join(missing_fields)}."}
        
        response = hrms.request_leave(data_dict)
        return handle_api_response(response, "request_leave")
    except Exception as e:
        logger.error(f"request_leave error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to submit leave request."}

def update_leave_status(hrms, leave_id: str, data: str):
    """Update leave status with validation"""
    try:
        if not leave_id:
            return {"success": False, "error": "Leave ID required", "user_message": "Leave ID is required to update status."}
        
        data_dict = safe_json_parse(data)
        if not data_dict:
            return {"success": False, "error": "Invalid data format", "user_message": "Invalid data format for status update."}
        
        response = hrms.update_leave_status(leave_id, data_dict)
        return handle_api_response(response, "update_leave_status")
    except Exception as e:
        logger.error(f"update_leave_status error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to update leave status."}

def get_team_pending_regularization_requests(hrms):
    """Get all pending regularization requests for the team (admin/hr only)"""
    try:
        params_dict = {"status": "pending"}
        response = hrms.get_all_regularizations(params_dict)
        return handle_api_response(response, "get_team_pending_regularization_requests")
    except Exception as e:
        logger.error(f"get_team_pending_regularization_requests error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve pending regularization requests."}

def get_all_regularizations(hrms, params: str = None):
    """Get all regularizations with enhanced error handling"""
    try:
        params_dict = safe_json_parse(params, {})
        response = hrms.get_all_regularizations(params_dict)
        return handle_api_response(response, "get_all_regularizations")
    except Exception as e:
        logger.error(f"get_all_regularizations error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve regularization requests."}

def request_regularization(hrms, data: str):
    """Request regularization with validation"""
    try:
        if not data or data.strip() == "":
            return {"success": False, "error": "No data provided", "user_message": "Regularization request data is required."}
        
        data_dict = safe_json_parse(data)
        if not data_dict:
            return {"success": False, "error": "Invalid data format", "user_message": "The regularization request data format is invalid."}
        
        response = hrms.request_regularization(data_dict)
        return handle_api_response(response, "request_regularization")
    except Exception as e:
        logger.error(f"request_regularization error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to submit regularization request."}

def review_regularization(hrms, reg_id: str, data: str):
    """Review regularization with validation"""
    try:
        if not reg_id:
            return {"success": False, "error": "Regularization ID required", "user_message": "Regularization ID is required to review the request."}
        
        data_dict = safe_json_parse(data)
        if not data_dict:
            return {"success": False, "error": "Invalid data format", "user_message": "Invalid data format for regularization review."}
        
        response = hrms.review_regularization(reg_id, data_dict)
        return handle_api_response(response, "review_regularization")
    except Exception as e:
        logger.error(f"review_regularization error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to review regularization request."}