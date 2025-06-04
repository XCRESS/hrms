'use client';

import { useEffect, useState } from 'react';
import apiClient from '../service/apiClient';
import useAuth from '../hooks/authjwt';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = useAuth();

  useEffect(() => {
    if (!user || (user.role !== 'hr' && user.role !== 'admin')) return;
    async function fetchEmployees() {
      try {
        const res = await apiClient.getEmployees();
        setEmployees(res.employees || []);
        setError(null);
      } catch (err) {
        setError('Error fetching employees: ' + (err?.message || String(err)));
      } finally {
        setLoading(false);
      }
    }
    fetchEmployees();
  }, [user]);

  if (!user) return <div>Loading...</div>;
  if (user.role !== 'hr' && user.role !== 'admin') return <div>Not authorized.</div>;
  if (loading) return <div>Loading employees...</div>;
  if (error) return <div>{error}</div>;
  return (
    <div>
      <h1>Employees List</h1>
      {employees.length === 0 ? (
        <p>No employees found.</p>
      ) : (
        <ul>
          {employees.map((employee, index) => (
            <li key={index}>{employee.fullName}</li>
          ))}
        </ul>
      )}
    </div>
  );
}