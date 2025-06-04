import useAuth from '../../hooks/authjwt';
import React from 'react';
export default function HolidaysManage() {
  let content;
  try {
    const user = useAuth();
    if (!user || (user.role !== 'hr' && user.role !== 'admin')) {
      content = <div>Not authorized.</div>;
    } else {
      content = <div>Manage Holidays (HR/Admin only) - To be implemented</div>;
    }
  } catch (err) {
    content = <div>Error: {String(err)}</div>;
  }
  return <div style={{padding:24}}>{content}</div>;
} 