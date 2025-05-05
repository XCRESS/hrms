"use client";
import React from "react";
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
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CheckCircle, User, Building, BriefcaseMedical, CreditCard, CalendarClock } from "lucide-react";

export default function CreateEmployeePage() {
  const [gender, setGender] = React.useState("");
  const [maritalStatus, setMaritalStatus] = React.useState("");
  const [officeAddress, setOfficeAddress] = React.useState("");
  const [paymentMode, setPaymentMode] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState(null);
  const [joiningDate, setJoiningDate] = React.useState(null);
  const [formSubmitted, setFormSubmitted] = React.useState(false);

  // Update the date of birth when the user selects a new date
  const handleDateChange = (date) => {
    setDateOfBirth(date);
  };
  
  const handleJoinDateChange = (date) => {
    setJoiningDate(date);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const form = e.target;
  
    const employeeData = {
      employeeId: form.employeeId.value,
      firstName: form.firstname.value,
      lastName: form.lastname.value,
      gender,
      dateOfBirth,
      maritalStatus,
      email: form.email.value,
      phone: form.phone.value,
      address: form.address.value,
      aadhaarNumber: form.aadhaarNumber.value,
      panNumber: form.panNumber.value,
      fatherName: form.fatherName.value,
      motherName: form.motherName.value,
      officeAddress,
      department: form.department.value,
      position: form.position.value,
      salary: parseFloat(form.salary.value),
      paymentMode,
      bankName: form.bankName.value,
      bankAccountNumber: form.bankAccountNumber.value,
      bankIFSCCode: form.bankIFSCCode.value,
      employmentType,
      reportingSupervisor: form.reportingSupervisor.value,
      joiningDate,
      emergencyContactName: form.emergencyContactName.value,
      emergencyContactNumber: form.emergencyContactNumber.value,
    };
    
    try {
      const res = await apiClient.createEmployee(employeeData);
      console.log("Employee creation requested", res);
      if (res.message === "Employee created") {
        console.log("Employee created successfully");
        setFormSubmitted(true);
        setTimeout(() => setFormSubmitted(false), 3000);
      }
    } catch (err) {
      console.error("Error creating employee", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 dark:bg-gray-900">
      <Card className="mx-auto w-full max-w-4xl shadow-lg bg-white dark:bg-gray-800">
        <CardHeader className="bg-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">Employee Registration</CardTitle>
              <CardDescription className="text-blue-100 mt-1">
                HRMS Employee Management System
              </CardDescription>
            </div>
            <User size={32} className="text-white" />
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {formSubmitted && (
            <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center">
              <CheckCircle className="mr-2" size={20} />
              <span>Employee created successfully!</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid grid-cols-5 mb-8">
                <TabsTrigger value="personal" className="flex items-center gap-2">
                  <User size={16} />
                  <span className="hidden md:inline">Personal</span>
                </TabsTrigger>
                <TabsTrigger value="contact" className="flex items-center gap-2">
                  <Building size={16} />
                  <span className="hidden md:inline">Contact</span>
                </TabsTrigger>
                <TabsTrigger value="employment" className="flex items-center gap-2">
                  <BriefcaseMedical size={16} />
                  <span className="hidden md:inline">Employment</span>
                </TabsTrigger>
                <TabsTrigger value="financial" className="flex items-center gap-2">
                  <CreditCard size={16} />
                  <span className="hidden md:inline">Financial</span>
                </TabsTrigger>
                <TabsTrigger value="additional" className="flex items-center gap-2">
                  <CalendarClock size={16} />
                  <span className="hidden md:inline">Additional</span>
                </TabsTrigger>
              </TabsList>
            
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabelInputContainer>
                    <Label htmlFor="employeeId" className="text-sm font-medium text-gray-700 dark:text-gray-300">Employee ID</Label>
                    <Input 
                      id="employeeId" 
                      name="employeeId" 
                      placeholder="abc123" 
                      type="text" 
                      required 
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                    />
                  </LabelInputContainer>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <LabelInputContainer>
                      <Label htmlFor="firstname" className="text-sm font-medium text-gray-700 dark:text-gray-300">First name</Label>
                      <Input 
                        id="firstname" 
                        name="firstname" 
                        placeholder="First" 
                        type="text" 
                        required 
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                      />
                    </LabelInputContainer>
                    <LabelInputContainer>
                      <Label htmlFor="lastname" className="text-sm font-medium text-gray-700 dark:text-gray-300">Last name</Label>
                      <Input 
                        id="lastname" 
                        name="lastname" 
                        placeholder="Last" 
                        type="text" 
                        required 
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                      />
                    </LabelInputContainer>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <LabelInputContainer>
                    <Label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</Label>
                    <DatePicker 
                      onDateChange={handleDateChange} 
                      selected={dateOfBirth} 
                      onChange={setDateOfBirth}
                      className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                    />
                  </LabelInputContainer>
                  
                  <LabelInputContainer>
                    <Label htmlFor="gender" className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender</Label>
                    <Select name="gender" onValueChange={setGender}>
                      <SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabelInputContainer>
                  
                  <LabelInputContainer>
                    <Label htmlFor="maritalStatus" className="text-sm font-medium text-gray-700 dark:text-gray-300">Marital Status</Label>
                    <Select name="maritalStatus" onValueChange={setMaritalStatus}>
                      <SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabelInputContainer>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabelInputContainer>
                    <Label htmlFor="fatherName" className="text-sm font-medium text-gray-700 dark:text-gray-300">Father's Name</Label>
                    <Input
                      id="fatherName"
                      name="fatherName"
                      placeholder="Enter your father's name"
                      type="text"
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                  
                  <LabelInputContainer>
                    <Label htmlFor="motherName" className="text-sm font-medium text-gray-700 dark:text-gray-300">Mother's Name</Label>
                    <Input
                      id="motherName"
                      name="motherName"
                      placeholder="Enter your mother's name"
                      type="text"
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                </div>
              </TabsContent>
          
              <TabsContent value="contact" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabelInputContainer>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      placeholder="your@email.com" 
                      type="email" 
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                    />
                  </LabelInputContainer>
                  
                  <LabelInputContainer>
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="XXXXXXXXXX"
                      type="tel"
                      pattern="[0-9]{10}"
                      maxLength="10"
                      title="Enter a valid 10-digit phone number"
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                </div>
                
                <LabelInputContainer>
                  <Label htmlFor="address" className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Enter your address (Street, City, State, Zip)"
                    type="text"
                    required
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </LabelInputContainer>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabelInputContainer>
                    <Label htmlFor="aadhaarNumber" className="text-sm font-medium text-gray-700 dark:text-gray-300">Aadhaar Number</Label>
                    <Input
                      id="aadhaarNumber"
                      name="aadhaarNumber"
                      placeholder="12-digit Aadhaar number"
                      type="text"
                      pattern="\d{12}"
                      maxLength="12" 
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                  
                  <LabelInputContainer>
                    <Label htmlFor="panNumber" className="text-sm font-medium text-gray-700 dark:text-gray-300">PAN Number</Label>
                    <Input
                      id="panNumber"
                      name="panNumber"
                      placeholder="Enter your PAN number"
                      type="text"
                      pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}"
                      maxLength="10"
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabelInputContainer>
                    <Label htmlFor="emergencyContactName" className="text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Contact Name</Label>
                    <Input
                      id="emergencyContactName"
                      name="emergencyContactName"
                      placeholder="Name"
                      type="text"
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                  
                  <LabelInputContainer>
                    <Label htmlFor="emergencyContactNumber" className="text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Contact Number</Label>
                    <Input
                      id="emergencyContactNumber"
                      name="emergencyContactNumber"
                      placeholder="XXXXXXXXXX"
                      type="tel"
                      pattern="[0-9]{10}"
                      maxLength="10"
                      title="Enter a valid 10-digit phone number"
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                </div>
              </TabsContent>
          
              <TabsContent value="employment" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabelInputContainer>
                    <Label htmlFor="department" className="text-sm font-medium text-gray-700 dark:text-gray-300">Department</Label>
                    <Input
                      id="department"
                      name="department"
                      placeholder="Enter your Department's name"
                      type="text"
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                  
                  <LabelInputContainer>
                    <Label htmlFor="position" className="text-sm font-medium text-gray-700 dark:text-gray-300">Position</Label>
                    <Input
                      id="position"
                      name="position"
                      placeholder="Enter your position"
                      type="text"
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabelInputContainer>
                    <Label htmlFor="employmentType" className="text-sm font-medium text-gray-700 dark:text-gray-300">Type of Employment</Label>
                    <Select name="employmentType" onValueChange={setEmploymentType}>
                      <SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fulltime">Full Time</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabelInputContainer>
                  
                  <LabelInputContainer>
                    <Label htmlFor="reportingSupervisor" className="text-sm font-medium text-gray-700 dark:text-gray-300">Reporting Supervisor</Label>
                    <Input
                      id="reportingSupervisor"
                      name="reportingSupervisor"
                      placeholder="Supervisor Name"
                      type="text"
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabelInputContainer>
                    <Label htmlFor="joiningDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of Joining</Label>
                    <JoinDate 
                      onDateChange={handleJoinDateChange} 
                      selected={joiningDate} 
                      onChange={setJoiningDate} 
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                  
                  <LabelInputContainer>
                    <Label htmlFor="officeAddress" className="text-sm font-medium text-gray-700 dark:text-gray-300">Office Location</Label>
                    <Select name="officeAddress" onValueChange={setOfficeAddress}>
                      <SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SanikColony">Sanik Colony</SelectItem>
                        <SelectItem value="Indore">Indore</SelectItem>
                        <SelectItem value="Delhi">Delhi</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabelInputContainer>
                </div>
              </TabsContent>
          
              <TabsContent value="financial" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabelInputContainer>
                    <Label htmlFor="salary" className="text-sm font-medium text-gray-700 dark:text-gray-300">Salary</Label>
                    <Input
                      id="salary"
                      name="salary"
                      placeholder="Enter Salary"
                      type="number"
                      min="0"
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                  
                  <LabelInputContainer>
                    <Label htmlFor="paymentMode" className="text-sm font-medium text-gray-700 dark:text-gray-300">Mode of Payment</Label>
                    <Select name="paymentMode" onValueChange={setPaymentMode}>
                      <SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bankTransfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabelInputContainer>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <LabelInputContainer>
                    <Label htmlFor="bankName" className="text-sm font-medium text-gray-700 dark:text-gray-300">Bank Name</Label>
                    <Input
                      id="bankName"
                      name="bankName"
                      placeholder="Enter Bank Name"
                      type="text"
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabelInputContainer>
                    <Label htmlFor="bankAccountNumber" className="text-sm font-medium text-gray-700 dark:text-gray-300">Bank Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      name="bankAccountNumber"
                      placeholder="Enter Account Number"
                      type="number"
                      minLength="5"
                      maxLength="18"
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                  
                  <LabelInputContainer>
                    <Label htmlFor="bankIFSCCode" className="text-sm font-medium text-gray-700 dark:text-gray-300">Bank IFSC Code</Label>
                    <Input
                      id="bankIFSCCode"
                      name="bankIFSCCode"
                      placeholder="Enter IFSC Code"
                      type="text"
                      maxLength={11}
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </LabelInputContainer>
                </div>
              </TabsContent>
          
              <TabsContent value="additional" className="space-y-4">
                <div className="flex justify-center p-12">
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      This section is reserved for future additional information.
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      You can add custom fields or additional information here as needed.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="mt-8 flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline"
                className="px-6 py-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                Save Employee
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const LabelInputContainer = ({ children, className }) => {
  return (
    <div className={cn("flex w-full flex-col space-y-1.5", className)}>
      {children}
    </div>
  );
};