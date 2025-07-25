"""
Utility functions for HR Buddy
"""
import json
import logging
from datetime import datetime, timedelta
import pytz

logger = logging.getLogger(__name__)

# Timezone utilities
ENABLE_TIMEZONE_CONVERSION = True

try:
    IST = pytz.timezone('Asia/Kolkata')
    UTC = pytz.timezone('UTC')
except Exception as e:
    logger.error(f"Error initializing timezone: {e}")
    ENABLE_TIMEZONE_CONVERSION = False

def get_ist_now() -> datetime:
    """Get current time in IST"""
    try:
        return datetime.now(IST)
    except Exception:
        # Fallback: Use UTC time + 5.5 hours
        utc_now = datetime.utcnow()
        return utc_now + timedelta(hours=5, minutes=30)

def get_yesterday_date() -> str:
    """Get yesterday's date in YYYY-MM-DD format (IST)"""
    yesterday = get_ist_now() - timedelta(days=1)
    return yesterday.strftime('%Y-%m-%d')

def get_today_date() -> str:
    """Get today's date in YYYY-MM-DD format (IST)"""
    return get_ist_now().strftime('%Y-%m-%d')

def validate_date_string(date_str: str) -> bool:
    """Validate if date string is in correct format"""
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
        return True
    except ValueError:
        return False

def format_date_for_api(date_str: str) -> str:
    """Format date string for API consumption"""
    try:
        # Handle various date formats
        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y']:
            try:
                parsed_date = datetime.strptime(date_str, fmt)
                return parsed_date.strftime('%Y-%m-%d')
            except ValueError:
                continue
        raise ValueError(f"Invalid date format: {date_str}")
    except Exception as e:
        logger.error(f"Date formatting error: {e}")
        return datetime.now().strftime('%Y-%m-%d')

def convert_utc_to_ist(utc_time_str: str, input_format: str = None) -> str:
    """Convert UTC datetime string to IST format"""
    try:
        if not utc_time_str:
            return ""
        
        # Common datetime formats from API
        formats_to_try = [
            '%Y-%m-%dT%H:%M:%S.%fZ',  # ISO format with microseconds
            '%Y-%m-%dT%H:%M:%SZ',     # ISO format without microseconds  
            '%Y-%m-%dT%H:%M:%S',      # ISO format without Z
            '%Y-%m-%d %H:%M:%S',      # Standard format
            '%Y-%m-%dT%H:%M:%S.%f',   # ISO with microseconds, no Z
        ]
        
        if input_format:
            formats_to_try.insert(0, input_format)
        
        parsed_utc = None
        for fmt in formats_to_try:
            try:
                parsed_utc = datetime.strptime(utc_time_str, fmt)
                break
            except ValueError:
                continue
        
        if not parsed_utc:
            # If parsing fails, return original string
            return utc_time_str
        
        # Make it timezone aware (UTC) and convert to IST
        try:
            utc_aware = UTC.localize(parsed_utc)
            ist_time = utc_aware.astimezone(IST)
            return ist_time.strftime('%I:%M %p')
        except Exception:
            # Fallback: Add 5.5 hours manually if pytz fails
            ist_time = parsed_utc + timedelta(hours=5, minutes=30)
            return ist_time.strftime('%I:%M %p')
        
    except Exception as e:
        logger.error(f"Error converting UTC to IST: {e}, input: {utc_time_str}")
        return utc_time_str

def format_time_for_display(time_str: str) -> str:
    """Format time string for user-friendly display"""
    try:
        if not time_str:
            return "Not recorded"
        
        # If it's already in a display format, return as is
        if "AM" in time_str or "PM" in time_str:
            return time_str
            
        # Try to convert from UTC
        return convert_utc_to_ist(time_str)
        
    except Exception as e:
        logger.error(f"Error formatting time for display: {e}")
        return time_str or "Not recorded"

def format_date_for_display(date_str: str) -> str:
    """Format date string for user-friendly display"""
    try:
        if not date_str:
            return ""
            
        # Parse the date
        parsed_date = None
        formats_to_try = ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y']
        
        for fmt in formats_to_try:
            try:
                parsed_date = datetime.strptime(date_str, fmt)
                break
            except ValueError:
                continue
        
        if parsed_date:
            return parsed_date.strftime('%d %B %Y')  # e.g., "24 July 2025"
        else:
            return date_str
            
    except Exception as e:
        logger.error(f"Error formatting date for display: {e}")
        return date_str

def safe_json_parse(json_str: str, default: dict = None) -> dict:
    """Safely parse JSON string with fallback"""
    if not json_str:
        return default or {}
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError) as e:
        logger.error(f"JSON parsing error: {e}, input: {json_str}")
        return default or {}

def convert_timestamps_in_data(data, timezone_fields=None):
    """Recursively convert UTC timestamps to IST in API response data"""
    if timezone_fields is None:
        # Common field names that contain timestamps
        timezone_fields = [
            'checkIn', 'checkOut', 'timestamp', 'createdAt', 'updatedAt', 
            'date', 'startDate', 'endDate', 'time', 'checkInTime', 'checkOutTime',
            'submittedAt', 'approvedAt', 'rejectedAt', 'reviewedAt'
        ]
    
    try:
        if isinstance(data, dict):
            converted_data = {}
            for key, value in data.items():
                if key in timezone_fields and isinstance(value, str) and value:
                    # Convert timestamp to IST
                    ist_time = convert_utc_to_ist(value)
                    converted_data[key] = ist_time
                    # Also create a display version for better formatting
                    if key in ['checkIn', 'checkOut', 'checkInTime', 'checkOutTime']:
                        converted_data[f"{key}_display"] = ist_time
                elif key == 'date' and isinstance(value, str) and value:
                    # For date fields, also add a display version
                    converted_data[key] = value
                    converted_data[f"{key}_display"] = format_date_for_display(value)
                elif isinstance(value, (dict, list)):
                    converted_data[key] = convert_timestamps_in_data(value, timezone_fields)
                else:
                    converted_data[key] = value
            return converted_data
        elif isinstance(data, list):
            return [convert_timestamps_in_data(item, timezone_fields) for item in data]
        else:
            return data
    except Exception as e:
        logger.error(f"Error in convert_timestamps_in_data: {e}")
        return data  # Return original data if conversion fails

def handle_api_response(response: dict, operation: str) -> dict:
    """Handle API response and format for AI consumption with timezone conversion"""
    if not response.get("success", False):
        error_type = response.get("error_type", "unknown_error")
        status_code = response.get("status_code", 500)
        message = response.get("message", "An unknown error occurred")
        
        logger.error(f"{operation} failed: {message} (Status: {status_code}, Type: {error_type})")
        
        # Format error for AI to understand and respond appropriately
        if error_type == "authentication_error":
            return {
                "success": False,
                "error": "Authentication failed. Please ensure you're logged in.",
                "user_message": "It seems your session has expired. Please log in again to access this information."
            }
        elif error_type == "permission_error":
            return {
                "success": False,
                "error": "Insufficient permissions for this operation.",
                "user_message": "You don't have permission to access this information. Please contact your HR administrator."
            }
        elif error_type == "validation_error":
            details = response.get("details", {})
            return {
                "success": False,
                "error": f"Invalid request parameters: {message}",
                "user_message": f"There was an issue with the request format. {message}",
                "details": details
            }
        elif error_type == "not_found_error":
            return {
                "success": False,
                "error": "Resource not found.",
                "user_message": "The requested information could not be found. It may not exist or may have been moved."
            }
        else:
            return {
                "success": False,
                "error": message,
                "user_message": "I'm unable to retrieve that information right now due to a system error. Please try again later or contact support if the issue persists."
            }
    
    # Convert timestamps to IST before returning successful response (if enabled)
    if ENABLE_TIMEZONE_CONVERSION:
        try:
            converted_data = convert_timestamps_in_data(response.get("data", {}))
            return {"success": True, "data": converted_data}
        except Exception as e:
            logger.error(f"Error in timezone conversion: {e}")
            return {"success": True, "data": response.get("data", {})}
    else:
        return {"success": True, "data": response.get("data", {})}