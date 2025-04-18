"use client";
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import DatePicker from "@/components/ui/datepicker";
import JoinDate from "@/components/ui/dateOfJoining";
import TracingBeam from "@/components/ui/tracing-beam";
import apiClient from "../service/apiClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"



export default function CreateEmployeePage() {
  const [gender, setGender] = React.useState("");
  const [maritalStatus, setMaritalStatus] = React.useState("");
  const [officeLocation, setOfficeLocation] = React.useState("");
  const [paymentMode, setPaymentMode] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState(null);
  const [dateOfJoining, setDateOfJoining] = React.useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const form = e.target;
  
    const employeeData = {
      firstName: form.firstname.value,
      lastName: form.lastname.value,
      employeeId: form.employeeId.value,
      email: form.email.value,
      phone: form.phone.value,
      address: form.address.value,
      aadhaar: form.aadhaar.value,
      panNumber: form.panNumber.value,
      fatherName: form.fatherName.value,
      motherName: form.motherName.value,
      department: form.department.value,
      position: form.position.value,
      salary: parseFloat(form.salary.value),
      bankName: form.bankName.value,
      bankAccountNumber: form.bankAccountNumber.value,
      bankIFSCCode: form.bankIFSCCode.value,
      reportingSupervisor: form.reportingSupervisor.value,
      gender,
      maritalStatus,
      officeLocation,
      paymentMode,
      employmentType,
      dateOfBirth,
      dateOfJoining,
    };
  
    try {
      const res = await apiClient.createEmployee(employeeData);
      console.log("Employee created successfully", res);
    } catch (err) {
      console.error("Error creating employee", err);
    }
  };
  return (
    <div className="shadow-input mb-90 mx-auto w-full max-w-md rounded-none bg-white p-4 md:rounded-2xl md:p-8 dark:bg-black">
      <TracingBeam>
      <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
        Fill Employee Details
      </h2>
      <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
        Ensure all sections are completed accurately
      </p>

      <form className="my-8" onSubmit={handleSubmit}>
        <div className="mb-4 flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
          <LabelInputContainer>
            <Label htmlFor="firstname">First name</Label>
            <Input id="firstname" name="firstname" placeholder="First" type="text" required />
          </LabelInputContainer>
          <LabelInputContainer>
            <Label htmlFor="lastname">Last name</Label>
            <Input id="lastname" name="lastname" placeholder="Last" type="text" required/>
          </LabelInputContainer>
        </div>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="employeeId">Employee ID</Label>
          <Input id="employeeId" name="employeeId" placeholder="abc123" type="text" required />
        </LabelInputContainer>
        <div className="mb-4 flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
          <LabelInputContainer>
            <Label htmlFor="dateOfBirth">D.O.B.</Label>
            <DatePicker selected={dateOfBirth} onChange={setDateOfBirth}/>
          </LabelInputContainer>
          <LabelInputContainer>
            <Label htmlFor="gender">Gender</Label>
            <Select name="gender" onValueChange={setGender}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </LabelInputContainer>
        </div>
        <LabelInputContainer>
          <Label htmlFor="maritalStatus">Marital Status</Label>
          <Select name="maritalStatus" onValueChange={setMaritalStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Marital Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Single">Single</SelectItem>
              <SelectItem value="Married">Married</SelectItem>
              <SelectItem value="Divorced">Divorced</SelectItem>
            </SelectContent>
          </Select>
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" name="email" placeholder="your@email.com" type="email" required />
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="phone">Phone Number</Label>
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
        <LabelInputContainer className="mb-4">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            name="address"
            placeholder="Enter your address (Street, City, State, Zip)"
            type="text"
            required
          />
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="aadhaar">Aadhaar Number</Label>
          <Input
            id="aadhaar"
            name="aadhaar"
            placeholder="12-digit Aadhaar number"
            type="text"
            pattern="\d{12}"
            maxLength="12"
            required
          />
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="panNumber">PAN Number</Label>
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
        <LabelInputContainer className="mb-4">
          <Label htmlFor="fatherName">Father's Name</Label>
          <Input
            id="fatherName"
            name="fatherName"
            placeholder="Enter your father's name"
            type="text"
            required
          />
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="motherName">Mother's Name</Label>
          <Input
            id="motherName"
            name="motherName"
            placeholder="Enter your mother's name"
            type="text"
            required
          />
        </LabelInputContainer>
        <LabelInputContainer className="mt-4 mb-4">
          <Label htmlFor="officeLocation">Office Location</Label> 
          <Select name="officeLocation" onValueChange={setOfficeLocation}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Office location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SanikColony">Sanik Colony</SelectItem>
              <SelectItem value="Indore">Indore</SelectItem>
              <SelectItem value="Delhi">Delhi</SelectItem>
            </SelectContent>
          </Select>
        </LabelInputContainer>        
        <LabelInputContainer className="mb-4">
          <Label htmlFor="Department">Department</Label>
          <Input
            id="department"
            name="department"
            placeholder="Enter your Department's name"
            type="text"
            required
          />
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            name="position"
            placeholder="Enter your position"
            type="text"
            required
          />
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
        <Label htmlFor="salary">Salary</Label>
          <Input
            id="salary"
            name="salary"
            placeholder="Enter Salary"
            type="number"
            min="0"
            step="1000" // Optional: For specifying steps, if needed, e.g., in increments of 1000
          />
        </LabelInputContainer>
        <LabelInputContainer className="mt-4 mb-4">
          <Select name="paymentMode" onValueChange={setPaymentMode}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Payment Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bankTransfer">Bank Transfer</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
            </SelectContent>
          </Select>
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="bankName">Bank Name</Label>
          <Input
            id="bankName"
            name="bankName"
            placeholder="Enter Bank Name"
            type="text"
          />
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
          <Input
            id="bankAccountNumber"
            name="bankAccountNumber"
            placeholder="Enter Account Number"
            type="number"
            min="5"
            max="18"
          />
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="bankIFSCCode">Bank IFSC Code</Label>
          <Input
            id="bankIFSCCode"
            name="bankIFSCCode"
            placeholder="Enter IFSC Code"
            type="text"
            maxLength={11} // IFSC code typically has a length of 11 characters
          />
        </LabelInputContainer>
        <LabelInputContainer className="mt-4 mb-4">
          <Select name="employmentType" onValueChange={setEmploymentType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Employment Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fulltime">Full Time</SelectItem>
              <SelectItem value="intern">Intern</SelectItem>
            </SelectContent>
          </Select>
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="reportingSupervisor">Reporting Supervisor</Label>
          <Input
            id="reportingSupervisor"
            name="reportingSupervisor"
            placeholder="Supervisor Name"
            type="text"
            required
          />
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
          <JoinDate selected={dateOfJoining} onChange={setDateOfJoining}/>
        </LabelInputContainer>



        <button
          className="group/btn relative block mt-8 h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset]"
          type="submit"
        >
          Save Details &rarr;
          <BottomGradient />
        </button>

        <div className="my-8 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent dark:via-neutral-700" />
      </form>
    </TracingBeam>
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