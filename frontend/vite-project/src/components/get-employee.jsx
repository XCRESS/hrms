'use client';

import { useEffect, useState } from 'react';
import apiClient from '../service/apiClient';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await apiClient.getEmployees();
        console.log('Fetched employees:', res);
        setEmployees(res.employees);
      } catch (err) {
        console.error('Error fetching employees', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEmployees();
  }, []);

  if (loading) return <div>Loading employees...</div>;

  return (
    <div>
      <h1>Employees List</h1>
      {employees.length === 0 ? (
        <p>No employees found.</p>
      ) : (
        <ul>
          {employees.map((employee, index) => (
            <li key={index}>
              {employee.fullName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}