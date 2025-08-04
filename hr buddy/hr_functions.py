"""
Unified HR Functions for HRMS Buddy
All HR operations using the new unified APIs
"""

import logging
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Union
import json

logger = logging.getLogger(__name__)

def handle_api_response(response: dict, function_name: str) -> dict:
    """Handle and format API responses consistently"""
    try:
        if not response.get("success", True):
            error_msg = response.get("message", "Unknown error occurred")
            logger.error(f"{function_name} API error: {error_msg}")
            
            return {
                "success": False,
                "error": error_msg,
                "user_message": f"Unable to complete the request: {error_msg}",
                "details": response
            }
        
        # Extract data from successful response
        data = response.get("data", response)
        
        return {
            "success": True,
            "data": data,
            "formatted_response": format_response_data(data, function_name)
        }
        
    except Exception as e:
        logger.error(f"Error handling response for {function_name}: {e}")
        return {
            "success": False,
            "error": str(e),
            "user_message": "An error occurred while processing the response."
        }

def format_response_data(data: dict, function_name: str) -> str:
    """Format response data for user-friendly display"""
    try:
        if function_name.startswith("attendance"):
            return format_attendance_response(data)
        elif function_name.startswith("task"):
            return format_task_response(data)
        else:
            return format_general_response(data)
    except Exception as e:
        logger.error(f"Error formatting response for {function_name}: {e}")
        return "Data retrieved successfully, but formatting failed."

def format_attendance_response(data: dict) -> str:
    """Format attendance data for display"""
    try:
        if "overview" in data:
            # Attendance overview response
            overview = data["overview"]
            stats = overview.get("statistics", {})
            
            response = f"📊 **Attendance Overview**\n\n"
            response += f"• **Total Employees:** {stats.get('totalEmployees', 'N/A')}\n"
            response += f"• **Present Today:** {stats.get('presentToday', 'N/A')} ({stats.get('attendanceRate', 'N/A')}%)\n"
            response += f"• **Absent Today:** {stats.get('absentToday', 'N/A')}\n"
            response += f"• **Late Arrivals:** {stats.get('lateToday', 'N/A')}\n"
            response += f"• **Punctuality Rate:** {stats.get('punctualityRate', 'N/A')}%\n"
            
            # Add insights if available
            insights = overview.get("insights", [])
            if insights:
                response += f"\n💡 **Key Insights:**\n"
                for insight in insights[:3]:  # Show top 3 insights
                    response += f"• {insight.get('message', 'No message')}\n"
            
            return response
            
        elif "records" in data:
            # Attendance records response
            records = data["records"]
            if not records:
                return "No attendance records found for the specified criteria."
                
            response = f"📋 **Attendance Records** ({len(records)} records)\n\n"
            
            for record in records[:10]:  # Show first 10 records
                emp_name = record.get("employeeName", "Unknown")
                date_str = format_date_display(record.get("date"))
                status = record.get("status", "Unknown").title()
                
                check_in = format_time_display(record.get("checkIn"))
                check_out = format_time_display(record.get("checkOut"))
                
                response += f"**{emp_name}** - {date_str}\n"
                response += f"  Status: {status}"
                if check_in:
                    response += f" | In: {check_in}"
                if check_out:
                    response += f" | Out: {check_out}"
                response += "\n\n"
            
            if len(records) > 10:
                response += f"... and {len(records) - 10} more records"
                
            return response
            
        elif "employee" in data:
            # Individual employee analysis
            employee = data.get("employee", {})
            analysis = data.get("analysis", {})
            
            response = f"👤 **{employee.get('name', 'Employee')} - Attendance Analysis**\n\n"
            
            if analysis:
                response += f"• **Attendance Rate:** {analysis.get('attendanceRate', 'N/A')}%\n"
                response += f"• **Punctuality Score:** {analysis.get('punctualityScore', 'N/A')}%\n"
                response += f"• **Department:** {employee.get('department', 'N/A')}\n"
                response += f"• **Position:** {employee.get('position', 'N/A')}\n"
            
            return response
            
        else:
            return f"Attendance data retrieved: {len(data)} items" if isinstance(data, list) else "Attendance data retrieved successfully"
            
    except Exception as e:
        logger.error(f"Error formatting attendance response: {e}")
        return "Attendance data retrieved successfully"

def format_task_response(data: dict) -> str:
    """Format task reports data for display"""
    try:
        if "overview" in data:
            # Task reports overview
            overview = data["overview"]
            stats = overview.get("statistics", {})
            
            response = f"📈 **Task Reports Overview**\n\n"
            response += f"• **Total Employees:** {stats.get('totalEmployees', 'N/A')}\n"
            response += f"• **Employees with Tasks:** {stats.get('employeesWithTasks', 'N/A')}\n"
            response += f"• **Task Reporting Rate:** {stats.get('taskReportingRate', 'N/A')}%\n"
            response += f"• **Average Productivity Score:** {stats.get('avgProductivityScore', 'N/A')}/100\n"
            response += f"• **Average Quality Score:** {stats.get('avgQualityScore', 'N/A')}/100\n"
            response += f"• **Completion Rate:** {stats.get('completionRate', 'N/A')}%\n"
            
            # Add top performers
            top_performers = overview.get("topPerformers", [])
            if top_performers:
                response += f"\n🏆 **Top Performers:**\n"
                for performer in top_performers[:3]:
                    response += f"• {performer.get('name', 'Unknown')} - Quality: {performer.get('avgQualityScore', 'N/A')}/100\n"
            
            return response
            
        elif "reports" in data:
            # Task reports records
            reports = data["reports"]
            if not reports:
                return "No task reports found for the specified criteria."
                
            response = f"📝 **Task Reports** ({len(reports)} reports)\n\n"
            
            for report in reports[:5]:  # Show first 5 reports
                emp_name = report.get("employeeName", "Unknown")
                date_str = format_date_display(report.get("date"))
                task_count = len(report.get("tasks", []))
                
                response += f"**{emp_name}** - {date_str}\n"
                response += f"  Tasks: {task_count}"
                
                if "productivityScore" in report:
                    response += f" | Productivity: {report['productivityScore']}/100"
                if "qualityScore" in report:
                    response += f" | Quality: {report['qualityScore']}/100"
                    
                response += "\n\n"
            
            if len(reports) > 5:
                response += f"... and {len(reports) - 5} more reports"
                
            return response
            
        elif "employee" in data:
            # Individual employee task analysis
            employee = data.get("employee", {})
            analysis = data.get("analysis", {})
            
            response = f"👤 **{employee.get('name', 'Employee')} - Task Performance**\n\n"
            
            if analysis:
                response += f"• **Productivity Score:** {analysis.get('productivityScore', 'N/A')}/100\n"
                response += f"• **Quality Score:** {analysis.get('qualityScore', 'N/A')}/100\n"
                response += f"• **Task Categories:** {', '.join(analysis.get('taskCategories', {}).keys()) if analysis.get('taskCategories') else 'N/A'}\n"
            
            # Add recommendations if available
            recommendations = data.get("recommendations", [])
            if recommendations:
                response += f"\n💡 **Recommendations:**\n"
                for rec in recommendations[:3]:
                    response += f"• {rec}\n"
            
            return response
            
        elif "insights" in data:
            # AI-powered insights
            insights = data["insights"]
            response = f"🤖 **AI Task Insights**\n\n"
            
            # Show productivity insights
            if "productivity" in insights:
                prod_insights = insights["productivity"]
                response += f"**Productivity Analysis:**\n"
                for insight in prod_insights[:3]:
                    response += f"• {insight.get('message', 'No message')}\n"
                response += "\n"
            
            # Show quality insights
            if "quality" in insights:
                quality_insights = insights["quality"]
                response += f"**Quality Analysis:**\n"
                for insight in quality_insights[:3]:
                    response += f"• {insight.get('message', 'No message')}\n"
                response += "\n"
            
            # Add recommendations
            recommendations = data.get("recommendations", [])
            if recommendations:
                response += f"**Recommendations:**\n"
                for rec in recommendations[:3]:
                    response += f"• {rec.get('title', rec) if isinstance(rec, dict) else rec}\n"
            
            return response
            
        else:
            return f"Task reports data retrieved: {len(data)} items" if isinstance(data, list) else "Task reports data retrieved successfully"
            
    except Exception as e:
        logger.error(f"Error formatting task response: {e}")
        return "Task reports data retrieved successfully"

def format_general_response(data: dict) -> str:
    """Format general response data"""
    try:
        if isinstance(data, list):
            return f"Retrieved {len(data)} items successfully"
        elif isinstance(data, dict):
            if "message" in data:
                return data["message"]
            else:
                return f"Data retrieved successfully: {len(data)} fields"
        else:
            return "Data retrieved successfully"
    except Exception as e:
        logger.error(f"Error formatting general response: {e}")
        return "Data retrieved successfully"

def format_date_display(date_str: str) -> str:
    """Format date for user-friendly display"""
    try:
        if not date_str:
            return "N/A"
        
        # Handle different date formats
        if 'T' in date_str:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        else:
            dt = datetime.strptime(date_str, '%Y-%m-%d')
        
        return dt.strftime('%d %B %Y')  # e.g., "25 July 2024"
    except:
        return date_str

def format_time_display(time_str: str) -> str:
    """Format time for user-friendly display"""
    try:
        if not time_str:
            return None
        
        dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
        return dt.strftime('%I:%M %p')  # e.g., "02:30 PM"
    except:
        return time_str

def get_today_date() -> str:
    """Get today's date in YYYY-MM-DD format"""
    return datetime.now().strftime('%Y-%m-%d')

def get_yesterday_date() -> str:
    """Get yesterday's date in YYYY-MM-DD format"""
    yesterday = datetime.now() - timedelta(days=1)
    return yesterday.strftime('%Y-%m-%d')

def get_date_range(period: str) -> tuple:
    """Get start and end dates for different periods"""
    today = datetime.now()
    
    if period == 'today':
        return today.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d')
    elif period == 'yesterday':
        yesterday = today - timedelta(days=1)
        return yesterday.strftime('%Y-%m-%d'), yesterday.strftime('%Y-%m-%d')
    elif period == 'week':
        start_of_week = today - timedelta(days=today.weekday())
        return start_of_week.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d')
    elif period == 'month':
        start_of_month = today.replace(day=1)
        return start_of_month.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d')
    elif period == 'last_month':
        # Get first day of last month
        first_of_this_month = today.replace(day=1)
        last_month = first_of_this_month - timedelta(days=1)
        first_of_last_month = last_month.replace(day=1)
        return first_of_last_month.strftime('%Y-%m-%d'), last_month.strftime('%Y-%m-%d')
    else:
        # Default to today
        return today.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d')

# =============================================================================
# UNIFIED HR FUNCTIONS
# =============================================================================

def get_attendance_overview(hr_client, period: str = 'today') -> dict:
    """Get attendance overview using unified HR API"""
    try:
        response = hr_client.get_attendance_overview(period=period)
        return handle_api_response(response, "attendance_overview")
    except Exception as e:
        logger.error(f"get_attendance_overview error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve attendance overview."}

def get_team_attendance_today(hr_client) -> dict:
    """Get today's team attendance"""
    try:
        response = hr_client.get_attendance_overview(period='today')
        return handle_api_response(response, "attendance_team_today")
    except Exception as e:
        logger.error(f"get_team_attendance_today error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve today's team attendance."}

def get_employee_attendance_analysis(hr_client, employee_id: str, period: str = 'month') -> dict:
    """Get individual employee attendance analysis"""
    try:
        start_date, end_date = get_date_range(period)
        response = hr_client.get_employee_attendance(employee_id, start_date, end_date)
        return handle_api_response(response, "attendance_employee_analysis")
    except Exception as e:
        logger.error(f"get_employee_attendance_analysis error: {e}")
        return {"success": False, "error": str(e), "user_message": f"Unable to retrieve attendance analysis for employee {employee_id}."}

def get_attendance_analytics(hr_client, period: str = 'month', group_by: str = 'department') -> dict:
    """Get attendance analytics and trends"""
    try:
        response = hr_client.get_attendance_analytics(period=period, group_by=group_by)
        return handle_api_response(response, "attendance_analytics")
    except Exception as e:
        logger.error(f"get_attendance_analytics error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve attendance analytics."}

def get_task_reports_overview(hr_client, period: str = 'month') -> dict:
    """Get task reports overview using unified HR API"""
    try:
        response = hr_client.get_task_reports_overview(period=period)
        return handle_api_response(response, "task_overview")
    except Exception as e:
        logger.error(f"get_task_reports_overview error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve task reports overview."}

def get_employee_task_analysis(hr_client, employee_id: str, period: str = 'month') -> dict:
    """Get individual employee task analysis"""
    try:
        logger.info(f"Getting task analysis for employee {employee_id} for period: {period}")
        start_date, end_date = get_date_range(period)
        logger.info(f"Date range: {start_date} to {end_date}")
        
        response = hr_client.get_employee_task_reports(employee_id, start_date, end_date)
        
        if not response.get("success"):
            logger.error(f"Task analysis API call failed for employee {employee_id}: {response.get('message', 'Unknown error')}")
            
            # Provide more specific error messages based on the error type
            error_type = response.get("error_type", "unknown")
            if error_type == "not_found_error":
                user_message = f"No task reports found for employee {employee_id} in the {period} period. The employee might not have submitted any task reports during this time."
            elif error_type == "permission_error":
                user_message = f"You don't have permission to view task reports for employee {employee_id}."
            elif error_type == "authentication_error":
                user_message = "Authentication failed. Please check if you're logged in properly."
            else:
                user_message = f"Unable to retrieve task analysis for employee {employee_id}. Error: {response.get('message', 'Unknown error')}"
            
            return {
                "success": False,
                "error": response.get("message", "API call failed"),
                "user_message": user_message,
                "details": response
            }
        
        result = handle_api_response(response, "task_employee_analysis")
        logger.info(f"Successfully retrieved task analysis for employee {employee_id}")
        return result
        
    except Exception as e:
        logger.error(f"get_employee_task_analysis error for employee {employee_id}: {e}", exc_info=True)
        return {
            "success": False, 
            "error": str(e), 
            "user_message": f"Unable to retrieve task analysis for employee {employee_id} due to an unexpected error: {str(e)}"
        }

def get_productivity_insights(hr_client, period: str = 'month') -> dict:
    """Get AI-powered productivity insights"""
    try:
        start_date, end_date = get_date_range(period)
        response = hr_client.get_task_insights(
            start_date, end_date, 
            focus_areas=['productivity', 'quality', 'patterns']
        )
        return handle_api_response(response, "task_insights")
    except Exception as e:
        logger.error(f"get_productivity_insights error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve productivity insights."}

def get_team_productivity_metrics(hr_client, period: str = 'month') -> dict:
    """Get team productivity metrics and benchmarking"""
    try:
        start_date, end_date = get_date_range(period)
        response = hr_client.get_productivity_metrics(start_date, end_date)
        return handle_api_response(response, "task_productivity_metrics")
    except Exception as e:
        logger.error(f"get_team_productivity_metrics error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve team productivity metrics."}

def search_employee_by_name(hr_client, employee_name: str) -> dict:
    """Search for employee by name and return employee ID"""
    try:
        logger.info(f"Searching for employee: '{employee_name}'")
        response = hr_client.get_all_employees()
        
        if not response.get("success"):
            logger.error(f"Failed to get employees list: {response.get('message', 'Unknown error')}")
            return {
                "success": False,
                "error": response.get("message", "Failed to retrieve employees list"),
                "user_message": f"Unable to search for employee '{employee_name}' because I couldn't retrieve the employees list. Error: {response.get('message', 'Unknown error')}"
            }
            
        employees = response.get("data", {}).get("data", [])
        logger.info(f"Retrieved {len(employees)} employees for search")
        
        if not employees:
            return {
                "success": False,
                "error": "No employees found in the system",
                "user_message": "No employees found in the system. Please check if the employee data is properly loaded."
            }
        
        # Search for employee by name (case-insensitive)
        matching_employees = []
        search_name = employee_name.lower().strip()
        
        logger.info(f"Searching for employee with name containing: '{search_name}'")
        
        for emp in employees:
            full_name = f"{emp.get('firstName', '')} {emp.get('lastName', '')}".lower().strip()
            first_name = emp.get('firstName', '').lower().strip()
            last_name = emp.get('lastName', '').lower().strip()
            
            if (search_name in full_name or 
                search_name == first_name or 
                search_name == last_name or
                full_name.startswith(search_name)):
                matching_employees.append({
                    'employeeId': emp.get('employeeId'),
                    'name': f"{emp.get('firstName', '')} {emp.get('lastName', '')}".strip(),
                    'department': emp.get('department', 'N/A'),
                    'position': emp.get('position', 'N/A')
                })
        
        logger.info(f"Found {len(matching_employees)} matching employees")
        
        if not matching_employees:
            # Provide suggestions of similar names
            all_names = [f"{emp.get('firstName', '')} {emp.get('lastName', '')}".strip() for emp in employees[:10]]  # Show first 10 names as suggestions
            suggestions = ", ".join(all_names)
            
            return {
                "success": False,
                "error": f"No employee found with name '{employee_name}'",
                "user_message": f"I couldn't find any employee named '{employee_name}'. Please check the spelling or try with a different name.\n\nSome employee names in the system: {suggestions}..."
            }
        
        if len(matching_employees) == 1:
            logger.info(f"Found exact match: {matching_employees[0]['name']} (ID: {matching_employees[0]['employeeId']})")
            return {
                "success": True,
                "data": matching_employees[0],
                "user_message": f"Found employee: {matching_employees[0]['name']}"
            }
        else:
            # Multiple matches found
            matches_text = "\n".join([f"• {emp['name']} ({emp['employeeId']}) - {emp['department']}" for emp in matching_employees])
            logger.info(f"Found multiple matches: {[emp['name'] for emp in matching_employees]}")
            return {
                "success": False,
                "error": f"Multiple employees found with name '{employee_name}'",
                "user_message": f"I found multiple employees with similar names:\n{matches_text}\n\nPlease be more specific with the full name."
            }
        
    except Exception as e:
        logger.error(f"search_employee_by_name error: {e}", exc_info=True)
        return {
            "success": False, 
            "error": str(e), 
            "user_message": f"Unable to search for employee '{employee_name}' due to an unexpected error: {str(e)}"
        }

def get_all_employees(hr_client) -> dict:
    """Get all employees list"""
    try:
        response = hr_client.get_all_employees()
        return handle_api_response(response, "all_employees")
    except Exception as e:
        logger.error(f"get_all_employees error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve employees list."}

def get_user_profile(hr_client) -> dict:
    """Get current user profile"""
    try:
        response = hr_client.get_user_profile()
        return handle_api_response(response, "user_profile")
    except Exception as e:
        logger.error(f"get_user_profile error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve your profile information."}