import Employee from '../models/Employee.model.js';
import { getISTNow, toIST } from '../utils/timezoneUtils.js';

class AlertService {
    
    // Get today's birthday and milestone alerts
    static async getTodayAlerts() {
        try {
            const today = getISTNow().toDate(); // Get proper IST date
            const alerts = [];

            // Get all active employees
            const employees = await Employee.find({ isActive: true });

            for (const employee of employees) {
                // Check for birthday alerts
                const birthdayAlert = this.checkBirthdayAlert(employee, today);
                if (birthdayAlert) {
                    alerts.push(birthdayAlert);
                }

                // Check for milestone alerts
                const milestoneAlert = this.checkMilestoneAlert(employee, today);
                if (milestoneAlert) {
                    alerts.push(milestoneAlert);
                }
            }

            return alerts;
        } catch (error) {
            console.error('Error getting today alerts:', error);
            return [];
        }
    }

    // Check if today is employee's birthday
    static checkBirthdayAlert(employee, today) {
        if (!employee.dateOfBirth) return null;
        
        const birthday = toIST(employee.dateOfBirth);
        const todayIST = toIST(today);
        
        // Check if today matches birthday (month and day) in IST
        if (birthday.month() === todayIST.month() && 
            birthday.date() === todayIST.date()) {
            
            const age = todayIST.year() - birthday.year();
            
            return {
                id: `birthday_${employee._id}_${todayIST.year()}`,
                type: 'birthday',
                employee: {
                    id: employee._id,
                    name: `${employee.firstName} ${employee.lastName}`,
                    employeeId: employee.employeeId,
                    department: employee.department
                },
                message: `🎉 Today is ${employee.firstName} ${employee.lastName}'s birthday! They are turning ${age} years old.`,
                icon: '🎂',
                priority: 'medium'
            };
        }
        
        return null;
    }

    // Check if today marks a milestone from joining date
    static checkMilestoneAlert(employee, today) {
        if (!employee.joiningDate) return null;
        
        const joiningDate = toIST(employee.joiningDate);
        const todayIST = toIST(today);
        
        // Calculate months between joining date and today
        const monthsDiff = this.calculateMonthsDifference(joiningDate, todayIST);
        
        // Define milestones (in months)
        const milestones = [3, 6, 12, 24, 36, 48, 60]; // 3m, 6m, 1y, 2y, 3y, 4y, 5y, etc.
        
        // Check if today is exactly a milestone
        if (milestones.includes(monthsDiff) && this.isSameDay(joiningDate, todayIST, monthsDiff)) {
            const milestoneText = this.formatMilestone(monthsDiff);
            
            return {
                id: `milestone_${employee._id}_${monthsDiff}m_${todayIST.year()}`,
                type: 'milestone',
                employee: {
                    id: employee._id,
                    name: `${employee.firstName} ${employee.lastName}`,
                    employeeId: employee.employeeId,
                    department: employee.department
                },
                message: `🏆 ${employee.firstName} ${employee.lastName} has completed ${milestoneText} with the company today!`,
                milestone: milestoneText,
                monthsCompleted: monthsDiff,
                icon: '🎖️',
                priority: monthsDiff >= 12 ? 'high' : 'medium'
            };
        }
        
        return null;
    }

    // Calculate difference in months between two dates
    static calculateMonthsDifference(startDate, endDate) {
        const yearDiff = endDate.year() - startDate.year();
        const monthDiff = endDate.month() - startDate.month();
        return yearDiff * 12 + monthDiff;
    }

    // Check if today is the same day of month as joining date (accounting for months passed)
    static isSameDay(joiningDate, today, monthsPassed) {
        const expectedDate = joiningDate.clone().add(monthsPassed, 'months');
        
        return expectedDate.date() === today.date() &&
               expectedDate.month() === today.month() &&
               expectedDate.year() === today.year();
    }

    // Format milestone duration into readable text
    static formatMilestone(months) {
        if (months < 12) {
            return `${months} month${months !== 1 ? 's' : ''}`;
        } else {
            const years = Math.floor(months / 12);
            const remainingMonths = months % 12;
            
            let text = `${years} year${years !== 1 ? 's' : ''}`;
            if (remainingMonths > 0) {
                text += ` and ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
            }
            return text;
        }
    }
}

export default AlertService;