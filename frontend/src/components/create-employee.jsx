"use client";
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import DatePicker from "@/components/ui/datepicker";
import JoinDate from "@/components/ui/dateOfJoining";
import apiClient from "../service/apiClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useAuth from '../hooks/authjwt';

export default function CreateEmployee() {
  const [gender, setGender] = React.useState("");
  const [maritalStatus, setMaritalStatus] = React.useState("");
  const [officeAddress, setOfficeAddress] = React.useState("");
  const [paymentMode, setPaymentMode] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState(null);
  const [joiningDate, setJoiningDate] = React.useState(null);
  const [fatherPhone, setFatherPhone] = React.useState("");
  const [motherPhone, setMotherPhone] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [form, setForm] = useState({ fullName: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  let user;
  try {
    user = useAuth();
  } catch (err) {
    return <div>Error: {String(err)}</div>;
  }
  if (!user || (user.role !== 'hr' && user.role !== 'admin')) {
    return <div>Not authorized.</div>;
  }

  // Update the date of birth when the user selects a new date
  const handleDateChange = (date) => {
    setDateOfBirth(date);
  };
  const handleJoinDateChange = (date) => {
    setJoiningDate(date);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Frontend validation for required dropdowns and dates
    if (!gender) {
      setError("Gender is required.");
      setLoading(false);
      return;
    }
    if (!dateOfBirth) {
      setError("Date of Birth is required.");
      setLoading(false);
      return;
    }
    if (!maritalStatus) {
      setError("Marital Status is required.");
      setLoading(false);
      return;
    }
    if (!officeAddress) {
      setError("Office Address is required.");
      setLoading(false);
      return;
    }
    if (!paymentMode) {
      setError("Payment Mode is required.");
      setLoading(false);
      return;
    }
    if (!employmentType) {
      setError("Employment Type is required.");
      setLoading(false);
      return;
    }
    if (!joiningDate) {
      setError("Joining Date is required.");
      setLoading(false);
      return;
    }

    // Build the full employee data object
    const employeeData = {
      employeeId: e.target.employeeId.value,
      firstName: e.target.firstname.value,
      lastName: e.target.lastname.value,
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
      maritalStatus,
      email: e.target.email.value,
      phone: e.target.phone.value ? Number(e.target.phone.value) : null,
      address: e.target.address.value,
      aadhaarNumber: e.target.aadhaarNumber.value ? Number(e.target.aadhaarNumber.value) : null,
      panNumber: e.target.panNumber.value,
      fatherName: e.target.fatherName.value,
      motherName: e.target.motherName.value,
      fatherPhone: fatherPhone ? Number(fatherPhone) : null,
      motherPhone: motherPhone ? Number(motherPhone) : null,
      officeAddress,
      companyName: companyName,
      department: e.target.department.value,
      position: e.target.position.value,
      paymentMode,
      bankName: e.target.bankName.value,
      bankAccountNumber: e.target.bankAccountNumber.value ? Number(e.target.bankAccountNumber.value) : null,
      bankIFSCCode: e.target.bankIFSCCode.value,
      employmentType,
      reportingSupervisor: e.target.reportingSupervisor.value,
      joiningDate: joiningDate ? new Date(joiningDate).toISOString() : null,
      emergencyContactName: e.target.emergencyContactName.value,
      emergencyContactNumber: e.target.emergencyContactNumber.value ? Number(e.target.emergencyContactNumber.value) : null,
    };

    try {
      console.log('Submitting employeeData:', employeeData); // Debug: log all fields
      const res = await apiClient.createEmployee(employeeData);
      setSuccess('Employee created successfully!');
      setError(null);
      // Optionally reset form fields here
    } catch (err) {
      console.error('API error:', err);
      let errorMsg = 'Error creating employee.';
      if (err?.data) {
        if (err.data.message) errorMsg += ' ' + err.data.message;
        if (err.data.errors) {
          if (Array.isArray(err.data.errors)) {
            errorMsg += ' ' + err.data.errors.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
          } else if (typeof err.data.errors === 'object') {
            errorMsg += ' ' + Object.values(err.data.errors).join(', ');
          }
        }
      } else if (err?.message) {
        errorMsg += ' ' + err.message;
      } else {
        errorMsg += ' An unknown error occurred.';
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
              Fill Employee Details
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              Ensure all sections are completed accurately
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-600 pb-2">
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LabelInputContainer>
                  <Label htmlFor="firstname">First name <span className="text-red-500">*</span></Label>
                  <Input id="firstname" name="firstname" placeholder="First" type="text" required />
                </LabelInputContainer>
                <LabelInputContainer>
                  <Label htmlFor="lastname">Last name <span className="text-red-500">*</span></Label>
                  <Input id="lastname" name="lastname" placeholder="Last" type="text" required/>
                </LabelInputContainer>
              </div>

              <LabelInputContainer>
                <Label htmlFor="employeeId">Employee ID <span className="text-red-500">*</span></Label>
                <Input id="employeeId" name="employeeId" placeholder="abc123" type="text" required />
              </LabelInputContainer>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LabelInputContainer>
                  <Label htmlFor="dateOfBirth">Date of Birth <span className="text-red-500">*</span></Label>
                  <DatePicker onDateChange={handleDateChange} selected={dateOfBirth} onChange={setDateOfBirth}/>
                </LabelInputContainer>
                <LabelInputContainer>
                  <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                  <Select name="gender" onValueChange={setGender}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </LabelInputContainer>
              </div>

              <LabelInputContainer>
                <Label htmlFor="maritalStatus">Marital Status <span className="text-red-500">*</span></Label>
                <Select name="maritalStatus" onValueChange={setMaritalStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Marital Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                  </SelectContent>
                </Select>
              </LabelInputContainer>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-600 pb-2">
                Contact Information
              </h3>
              
              <LabelInputContainer>
                <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                <Input id="email" name="email" placeholder="your@email.com" type="email" required />
              </LabelInputContainer>

              <LabelInputContainer>
                <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="XXXXXXXXXX"
                  type="tel"
                  pattern="[0-9]{10}"
                  maxLength="10"
                  title="Enter a valid 10-digit phone number"
                  required
                />
              </LabelInputContainer>

              <LabelInputContainer>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Enter your address (Street, City, State, Zip)"
                  type="text"
                />
              </LabelInputContainer>
            </div>

            {/* Government Documents Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-600 pb-2">
                Government Documents
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LabelInputContainer>
                  <Label htmlFor="aadhaarNumber">Aadhaar Number <span className="text-red-500">*</span></Label>
                  <Input
                    id="aadhaarNumber"
                    name="aadhaarNumber"
                    placeholder="12-digit Aadhaar number"
                    type="text"
                    pattern="\d{12}"
                    maxLength="12"
                    required
                  />
                </LabelInputContainer>
                <LabelInputContainer>
                  <Label htmlFor="panNumber">PAN Number <span className="text-red-500">*</span></Label>
                  <Input
                    id="panNumber"
                    name="panNumber"
                    placeholder="Enter your PAN number"
                    type="text"
                    pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}"
                    maxLength="10"
                    required
                  />
                </LabelInputContainer>
              </div>
            </div>

            {/* Family Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-600 pb-2">
                Family Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LabelInputContainer>
                  <Label htmlFor="fatherName">Father's Name</Label>
                  <Input
                    id="fatherName"
                    name="fatherName"
                    placeholder="Enter your father's name"
                    type="text"
                  />
                </LabelInputContainer>
                <LabelInputContainer>
                  <Label htmlFor="fatherPhone">Father's Phone Number</Label>
                  <Input
                    id="fatherPhone"
                    name="fatherPhone"
                    placeholder="Enter father's phone number"
                    type="tel"
                    pattern="[0-9]{10}"
                    maxLength="10"
                    title="Enter a valid 10-digit phone number"
                    value={fatherPhone}
                    onChange={(e) => setFatherPhone(e.target.value)}
                  />
                </LabelInputContainer>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LabelInputContainer>
                  <Label htmlFor="motherName">Mother's Name</Label>
                  <Input
                    id="motherName"
                    name="motherName"
                    placeholder="Enter your mother's name"
                    type="text"
                  />
                </LabelInputContainer>
                <LabelInputContainer>
                  <Label htmlFor="motherPhone">Mother's Phone Number</Label>
                  <Input
                    id="motherPhone"
                    name="motherPhone"
                    placeholder="Enter mother's phone number"
                    type="tel"
                    pattern="[0-9]{10}"
                    maxLength="10"
                    title="Enter a valid 10-digit phone number"
                    value={motherPhone}
                    onChange={(e) => setMotherPhone(e.target.value)}
                  />
                </LabelInputContainer>
              </div>
            </div>

            {/* Work Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-600 pb-2">
                Work Information
              </h3>
              
              <LabelInputContainer>
                <Label htmlFor="officeAddress">Office Location <span className="text-red-500">*</span></Label> 
                <Select name="officeAddress" onValueChange={setOfficeAddress}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select office location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SanikColony">Sanik Colony</SelectItem>
                    <SelectItem value="Indore">Indore</SelectItem>
                    <SelectItem value="N.F.C.">N.F.C.</SelectItem>
                  </SelectContent>
                </Select>
              </LabelInputContainer>

              <LabelInputContainer>
                <Label htmlFor="companyName">Company Name </Label>
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="Enter company name"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </LabelInputContainer>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LabelInputContainer>
                  <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
                  <Input
                    id="department"
                    name="department"
                    placeholder="Enter your Department's name"
                    type="text"
                    required
                  />
                </LabelInputContainer>
                <LabelInputContainer>
                  <Label htmlFor="position">Position <span className="text-red-500">*</span></Label>
                  <Input
                    id="position"
                    name="position"
                    placeholder="Enter your position"
                    type="text"
                    required
                  />
                </LabelInputContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LabelInputContainer>
                  <Label htmlFor="employmentType">Type of Employment <span className="text-red-500">*</span></Label> 
                  <Select name="employmentType" onValueChange={setEmploymentType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Employment Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fulltime">Full Time</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                    </SelectContent>
                  </Select>
                </LabelInputContainer>
                <LabelInputContainer>
                  <Label htmlFor="reportingSupervisor">Reporting Supervisor <span className="text-red-500">*</span></Label>
                  <Input
                    id="reportingSupervisor"
                    name="reportingSupervisor"
                    placeholder="Supervisor Name"
                    type="text"
                    required
                  />
                </LabelInputContainer>
              </div>

              <LabelInputContainer>
                <Label htmlFor="joiningDate">Date of Joining <span className="text-red-500">*</span></Label> 
                <JoinDate onDateChange={handleJoinDateChange} selected={joiningDate} onChange={setJoiningDate}/>
              </LabelInputContainer>
            </div>

            {/* Payment Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-600 pb-2">
                Payment Information
              </h3>
              
              <LabelInputContainer>
                <Label htmlFor="paymentMode">Mode of Payment <span className="text-red-500">*</span></Label> 
                <Select name="paymentMode" onValueChange={setPaymentMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Payment Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bankTransfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </LabelInputContainer>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LabelInputContainer>
                  <Label htmlFor="bankName">Bank Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="bankName"
                    name="bankName"
                    placeholder="Enter Bank Name"
                    type="text"
                    required
                  />
                </LabelInputContainer>
                <LabelInputContainer>
                  <Label htmlFor="bankIFSCCode">Bank IFSC Code <span className="text-red-500">*</span></Label>
                  <Input
                    id="bankIFSCCode"
                    name="bankIFSCCode"
                    placeholder="Enter IFSC Code"
                    type="text"
                    maxLength={11}
                    required
                  />
                </LabelInputContainer>
              </div>

              <LabelInputContainer>
                <Label htmlFor="bankAccountNumber">Bank Account Number <span className="text-red-500">*</span></Label>
                <Input
                  id="bankAccountNumber"
                  name="bankAccountNumber"
                  placeholder="Enter Account Number"
                  type="number"
                  minLength="5"
                  maxLength="18"
                  required
                />
              </LabelInputContainer>
            </div>

            {/* Emergency Contact Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-600 pb-2">
                Emergency Contact
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LabelInputContainer>
                  <Label htmlFor="emergencyContactName">Emergency Contact Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="emergencyContactName"
                    name="emergencyContactName"
                    placeholder="Name"
                    type="text"
                    required
                  />
                </LabelInputContainer>
                <LabelInputContainer>
                  <Label htmlFor="emergencyContactNumber">Emergency Contact Number <span className="text-red-500">*</span></Label>
                  <Input
                    id="emergencyContactNumber"
                    name="emergencyContactNumber"
                    placeholder="XXXXXXXXXX"
                    type="tel"
                    pattern="[0-9]{10}"
                    maxLength="10"
                    title="Enter a valid 10-digit phone number"
                    required
                  />
                </LabelInputContainer>
              </div>
            </div>

            <div className="pt-6">
              <button
                className="w-full relative h-12 rounded-lg bg-gradient-to-br from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 font-medium text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Creating Employee...' : 'Save Details'}
                <BottomGradient />
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-300 text-sm">{success}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
};

const LabelInputContainer = ({ children, className }) => {
  return (
    <div className={cn("flex w-full flex-col space-y-2", className)}>
      {children}
    </div>
  );
};