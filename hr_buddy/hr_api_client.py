"""
Simplified HR API Client for HRMS Buddy
Integrates with the new simplified HR APIs for attendance and task reports
"""

import requests
import json
import logging
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Union
import time
from functools import wraps

logger = logging.getLogger(__name__)

def retry_on_failure(max_retries: int = 2, delay: float = 0.3):
    """Retry decorator for robust API calls"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {str(e)}. Retrying in {delay}s...")
                        time.sleep(delay * (1.5 ** attempt))
                    else:
                        logger.error(f"All {max_retries} attempts failed for {func.__name__}: {str(e)}")
            raise last_exception
        return wrapper
    return decorator

class SimplifiedHRClient:
    """Simplified HR API Client for attendance and task reports"""
    
    def __init__(self, base_url: str = "https://hrms-backend.up.railway.app"):
        self.base_url = base_url.rstrip('/')
        self.api_base = f"{self.base_url}/api"
        self.session = requests.Session()
        self.token = None
        self.session.timeout = 15
        
        # Set default headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'HRMS-Buddy/2.1.0'
        })
        
    def set_token(self, token: str):
        """Set authentication token for API requests"""
        self.token = token
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        
    @retry_on_failure(max_retries=2, delay=0.5)
    def _make_request(self, method: str, endpoint: str, data: dict = None, params: dict = None) -> dict:
        """Make HTTP request with comprehensive error handling"""
        url = f"{self.api_base}/{endpoint.lstrip('/')}"
        
        logger.info(f"Making {method} request to {url} with params: {params}")
        
        try:
            # Clean parameters
            if params:
                params = self._clean_params(params)
            
            response = self.session.request(
                method, 
                url, 
                json=data, 
                params=params, 
                timeout=15
            )
            
            # Handle status codes
            if response.status_code == 401:
                return {
                    "success": False, 
                    "message": "Authentication required or token expired", 
                    "status_code": 401,
                    "error_type": "authentication_error"
                }
            elif response.status_code == 403:
                return {
                    "success": False,
                    "message": "Insufficient permissions to access this resource",
                    "status_code": 403,
                    "error_type": "permission_error"
                }
            elif response.status_code == 404:
                return {
                    "success": False,
                    "message": "Resource not found or endpoint does not exist",
                    "status_code": 404,
                    "error_type": "not_found_error"
                }
            elif response.status_code == 400:
                try:
                    error_detail = response.json()
                    return {
                        "success": False,
                        "message": f"Bad request: {error_detail.get('message', 'Invalid request parameters')}",
                        "status_code": 400,
                        "error_type": "validation_error",
                        "details": error_detail
                    }
                except:
                    return {
                        "success": False,
                        "message": "Bad request: Invalid request parameters or format",
                        "status_code": 400,
                        "error_type": "validation_error"
                    }
            
            response.raise_for_status()
            
            # Parse JSON response
            try:
                result = response.json()
                logger.info(f"Successful response from {url}")
                return {"success": True, "data": result, "status_code": response.status_code}
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error for {url}: {e}")
                return {
                    "success": False, 
                    "message": "Invalid JSON response from server",
                    "error_type": "json_decode_error"
                }
                
        except requests.exceptions.Timeout:
            logger.error(f"Request timeout for {url}")
            return {
                "success": False, 
                "message": "Request timed out. The server might be busy, please try again.",
                "error_type": "timeout_error"
            }
        except requests.exceptions.ConnectionError:
            logger.error(f"Connection error for {url}")
            return {
                "success": False, 
                "message": "Unable to connect to the server. Please check your internet connection.",
                "error_type": "connection_error"
            }
        except Exception as e:
            logger.error(f"Unexpected error for {url}: {e}")
            return {
                "success": False, 
                "message": f"Unexpected error: {str(e)}",
                "error_type": "unexpected_error"
            }
    
    def _clean_params(self, params: dict) -> dict:
        """Clean and validate parameters"""
        cleaned = {}
        for key, value in params.items():
            if value is not None and value != '':
                if 'date' in key.lower() and isinstance(value, str):
                    try:
                        # Ensure date is in YYYY-MM-DD format
                        if len(value) == 10 and value.count('-') == 2:
                            cleaned[key] = value
                        else:
                            # Try to parse and format
                            dt = datetime.strptime(value, '%Y-%m-%d')
                            cleaned[key] = dt.strftime('%Y-%m-%d')
                    except:
                        cleaned[key] = value
                else:
                    cleaned[key] = value
        return cleaned

    # =============================================================================
    # HR ATTENDANCE API METHODS (Simplified)
    # =============================================================================
    
    def get_attendance_overview(self, date: str = None) -> dict:
        """Get attendance overview from simplified HR API"""
        params = {'operation': 'overview'}
        if date:
            params['date'] = date
            
        return self._make_request("GET", "/hr/attendance", params=params)
    
    def get_attendance_records(self, start_date: str, end_date: str, 
                             page: int = 1, limit: int = 50) -> dict:
        """Get filtered attendance records from simplified HR API"""
        params = {
            'operation': 'records',
            'startDate': start_date,
            'endDate': end_date,
            'page': page,
            'limit': limit
        }
            
        return self._make_request("GET", "/hr/attendance", params=params)
    
    def get_employee_attendance(self, employee_id: str, start_date: str, end_date: str) -> dict:
        """Get individual employee attendance analysis"""
        params = {
            'operation': 'employee',
            'employeeId': employee_id,
            'startDate': start_date,
            'endDate': end_date
        }
        
        return self._make_request("GET", "/hr/attendance", params=params)
    
    # =============================================================================
    # HR TASK REPORTS API METHODS (Simplified)
    # =============================================================================
    
    def get_task_reports_overview(self, period: str = 'month') -> dict:
        """Get task reports overview from simplified HR API"""
        params = {
            'operation': 'overview',
            'period': period
        }
            
        return self._make_request("GET", "/hr/task-reports", params=params)
    
    def get_task_reports(self, start_date: str, end_date: str,
                        page: int = 1, limit: int = 50) -> dict:
        """Get filtered task reports from simplified HR API"""
        params = {
            'operation': 'reports',
            'startDate': start_date,
            'endDate': end_date,
            'page': page,
            'limit': limit
        }
            
        return self._make_request("GET", "/hr/task-reports", params=params)
    
    def get_employee_task_reports(self, employee_id: str, start_date: str, end_date: str) -> dict:
        """Get individual employee task reports analysis"""
        params = {
            'operation': 'employee',
            'employeeId': employee_id,
            'startDate': start_date,
            'endDate': end_date
        }
        
        return self._make_request("GET", "/hr/task-reports", params=params)
    
    # =============================================================================
    # EXISTING EMPLOYEE API METHODS (Compatibility)
    # =============================================================================
    
    def get_user_profile(self) -> dict:
        """Get current user profile"""
        return self._make_request("GET", "/employees/profile")
    
    def get_all_employees(self) -> dict:
        """Get all employees"""
        return self._make_request("GET", "/employees")