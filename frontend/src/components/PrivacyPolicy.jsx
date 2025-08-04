
import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Privacy Policy</h1>
        <div className="prose dark:prose-invert max-w-4xl mx-auto">
          <p className="mb-4">Last updated: August 04, 2025</p>

          <h2 className="text-2xl font-semibold mt-6 mb-2">1. Company as a Service Provider</h2>
          <p>
            Our HRMS app is primarily used by companies and organizations to manage their employees. In most cases, we process personal data only according to the instructions of our customers (the employers).
            If you are an employee and wish to exercise your data privacy rights (access, update, or deletion), please contact your employer directly. We will assist them in fulfilling your request in accordance with applicable law.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-2">2. Personal Data We Collect</h2>
          <p>
            We collect personal data in two ways: directly from you (employee) and through your employer (organization using our service).
          </p>
          <h3 className="text-xl font-semibold mt-4 mb-2">A. Personal Information</h3>
          <ul className="list-disc list-inside">
            <li>Full Name</li>
            <li>Date of Birth & Gender</li>
            <li>Residential Address</li>
            <li>Contact Number & Email</li>
            <li>Parents’ Names and Contact Numbers</li>
            <li>Emergency Contact Details</li>
          </ul>
          <h3 className="text-xl font-semibold mt-4 mb-2">B. Identification Information</h3>
          <ul className="list-disc list-inside">
            <li>PAN Card Number</li>
            <li>Aadhaar Card Number</li>
            <li>Employee ID & Designation</li>
          </ul>
          <h3 className="text-xl font-semibold mt-4 mb-2">C. Banking & Employment Details</h3>
          <ul className="list-disc list-inside">
            <li>Bank Account Number & IFSC Code (for salary processing)</li>
            <li>Department, Joining Date, and Job Role</li>
          </ul>
          <h3 className="text-xl font-semibold mt-4 mb-2">D. Work Activity Data</h3>
          <ul className="list-disc list-inside">
            <li>Check-in and Check-out times</li>
            <li>Daily Task Reports (mandatory for check-out)</li>
            <li>Attendance records and performance logs</li>
          </ul>
          <h3 className="text-xl font-semibold mt-4 mb-2">E. Location Data</h3>
          <ul className="list-disc list-inside">
            <li>GPS location at check-in to verify attendance</li>
            <li>No continuous or background tracking</li>
          </ul>
          <h3 className="text-xl font-semibold mt-4 mb-2">F. Device and Technical Data</h3>
          <ul className="list-disc list-inside">
            <li>Device ID, IP Address, and App version (for security and troubleshooting)</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6 mb-2">3. Personal Data from Other Sources</h2>
          <p>
            Your employer may provide us with additional employee information to complete your HR profile. We do not collect any other data from public sources or third parties without your consent.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-2">4. How We Use Your Personal Data</h2>
          <p>
            We process personal data for the following purposes:
          </p>
          <ol className="list-decimal list-inside">
            <li><strong>Employee Onboarding and HR Management:</strong> Storing employee details, identification, and bank information.</li>
            <li><strong>Attendance and Task Management:</strong> Recording check-in/check-out times and daily work reports.</li>
            <li><strong>Payroll Processing:</strong> Using bank details for salary disbursement.</li>
            <li><strong>Emergency Contacting:</strong> Contacting parents or emergency contacts if needed.</li>
            <li><strong>Legal and Compliance Requirements:</strong> Maintaining records for statutory and audit purposes.</li>
          </ol>

          <h2 className="text-2xl font-semibold mt-6 mb-2">5. Cookies and Tracking Technologies (Website Only)</h2>
          <p>
            When you visit our website, we may use cookies and tracking technologies to:
          </p>
          <ul className="list-disc list-inside">
            <li>Understand website usage and improve functionality</li>
            <li>Authenticate users in secure areas of the site</li>
            <li>Track technical performance for analytics purposes</li>
          </ul>
          <p>
            You can disable cookies in your browser settings, but some site features may not function properly.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-2">6. Data Sharing and Disclosure</h2>
          <p>
            We do not sell personal data. We only share data in the following cases:
          </p>
          <ul className="list-disc list-inside">
            <li>With authorized HR and payroll service providers</li>
            <li>To comply with legal or regulatory requirements</li>
            <li>To protect our rights, security, or users</li>
          </ul>
          <p>
            If the company undergoes a merger, acquisition, or asset transfer, your data may be part of the transferred assets.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-2">7. Data Retention</h2>
          <p>
            We retain employee data:
          </p>
          <ul className="list-disc list-inside">
            <li>During the period of employment</li>
            <li>For a limited period after termination for legal, audit, and payroll purposes</li>
            <li>Sensitive data (Aadhaar, PAN, banking) is securely deleted when no longer required</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6 mb-2">8. Security Measures</h2>
          <p>
            We use industry-standard encryption, secure servers, and access controls to protect your data. However, no method of online transmission is 100% secure, so we cannot guarantee absolute security.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-2">9. Your Rights</h2>
          <p>
            Depending on your location and applicable laws, you may have the right to:
          </p>
          <ul className="list-disc list-inside">
            <li>Access the personal data we hold about you</li>
            <li>Request correction or deletion of inaccurate information</li>
            <li>Restrict or object to certain types of processing</li>
            <li>Withdraw consent for optional data processing</li>
          </ul>
          <p>
            If your data is processed under the instructions of your employer, please contact your employer directly to exercise your rights.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-2">10. Children’s Privacy</h2>
          <p>
            Our services are intended only for adults (18+). We do not knowingly collect data from minors. If you believe a minor has provided personal data, please contact us for removal.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-2">11. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy periodically to reflect legal, technical, or operational changes. Any significant changes will be notified via the App or company communication channels.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-2">12. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our data practices, contact: <a href="mailto:example@example.com" className="text-blue-500 hover:underline">example@example.com</a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
