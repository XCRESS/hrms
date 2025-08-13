import requests
import json

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
    
employee_data = get_employee_details()

for i in employee_data["employees"]:
    print(i["fullName"])