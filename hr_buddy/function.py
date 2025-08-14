import requests

url = "https://hrms-backend.up.railway.app/api"

authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ZmNiMDU2Y2RhZTJlMjcxYmNjMjk5ZiIsInJvbGUiOiJhZG1pbiIsIm5hbWUiOiJWZXNoYW50IiwiZW1haWwiOiJ2ZXNoYW50QGNvc21vc2Zpbi5jb20iLCJlbXBsb3llZSI6IjY4NTI2MmFmNDY4NjI2ZmQyYTA4ZWUzYiIsImVtcGxveWVlSWQiOiJDRkcvQ0lBTUwvMTVGQkQiLCJpYXQiOjE3NTQ5MDM2NjksImV4cCI6MTc1NTUwODQ2OX0.lkeK7ymzuX1CYS5jfARSqJGj1k-RN4UN9_k4UQQdScI'

def check_health():
    try:
        response = requests.get(url, timeout=5)  # added timeout for safety
        if response.ok:
            return "Response:", response.json()
        else:
            return f"Service returned status code: {response.status_code}"
    except requests.exceptions.RequestException as e:
        return f"An error occurred: {e}"

print(check_health())


def get_employee_details():
    try:
        response = requests.get(f"{url}/employees", headers={'Authorization': f'Bearer {authToken}'}, timeout=5)
        if response:
            return response.json()
        else:
            return "failed to fetch employee details"
    except requests.exceptions.RequestException as e:
        return f"An error occurred: {e}"    

def get_employee_attendance(employeeId=None, startDate=None, endDate=None, status=None, page=None, limit=None):
    """
    Fetches attendance records for employees.

    Args:
        employeeId (str, optional): The ID of the employee. Defaults to None.
        startDate (str, optional): The start date in YYYY-MM-DD format. Defaults to None.
        endDate (str, optional): The end date in YYYY-MM-DD format. Defaults to None.
        status (str, optional): The attendance status (e.g., 'present', 'absent'). Defaults to None.
        page (int, optional): The page number for pagination. Defaults to None.
        limit (int, optional): The number of records per page. Defaults to None.

    Returns:
        dict or str: The JSON response from the API or an error message.
    """
    try:
        params = {
            'employeeId': employeeId,
            'startDate': startDate,
            'endDate': endDate,
            'status': status,
            'page': page,
            'limit': limit
        }
        # Filter out None values so they are not sent as query parameters
        params = {k: v for k, v in params.items() if v is not None}

        response = requests.get(
            f"{url}/attendance",
            headers={'Authorization': f'Bearer {authToken}'},
            params=params,
            timeout=10
        )
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        return f"HTTP error occurred: {http_err} - {response.text}"
    except requests.exceptions.RequestException as e:
        return f"An error occurred: {e}"