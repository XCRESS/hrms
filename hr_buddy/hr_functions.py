"""
Simplified HR Functions for HRMS Buddy
Core functions for today/yesterday context, API calling, and employee data retrieval
"""

import logging
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Union
import json

logger = logging.getLogger(__name__)

def get_today_date() -> str:
    """Get today's date in YYYY-MM-DD format"""
    return datetime.now().strftime('%Y-%m-%d')

def get_yesterday_date() -> str:
    """Get yesterday's date in YYYY-MM-DD format"""
    yesterday = datetime.now() - timedelta(days=1)
    return yesterday.strftime('%Y-%m-%d')