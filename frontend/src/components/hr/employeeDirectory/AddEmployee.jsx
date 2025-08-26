import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import apiClient from "@/service/apiClient";
import { useToast } from "@/components/ui/toast";
import BackButton from "@/components/ui/BackButton";
import EnhancedDOBPicker from "@/components/ui/enhanced-dob-picker";
import EnhancedJoiningPicker from "@/components/ui/enhanced-joining-picker";
import { cn } from "@/lib/utils";

const AddEmployee = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [formData, setFormData] = useState({
    employeeId: "",
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: null, // Changed to null for date picker
    maritalStatus: "",
    email: "",
    phone: "",
    address: "",
    aadhaarNumber: "",
    panNumber: "",
    fatherName: "",
    motherName: "",
    fatherPhone: "",
    motherPhone: "",
    officeAddress: "",
    companyName: "",
    department: "",
    position: "",
    paymentMode: "",
    bankName: "",
    bankAccountNumber: "",
    bankIFSCCode: "",
    employmentType: "",
    reportingSupervisor: "",
    joiningDate: null, // Changed to null for date picker
    emergencyContactName: "",
    emergencyContactNumber: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleDateOfBirthChange = (date) => {
    setFormData({ ...formData, dateOfBirth: date });
  };

  const handleJoiningDateChange = (date) => {
    setFormData({ ...formData, joiningDate: date });
  };

  // Load departments on component mount
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await apiClient.getDepartments();
        setDepartments(response.data.departments || []);
      } catch (error) {
        console.error('❌ Failed to load departments:', error);
        console.error('❌ Error details:', error.message, error.status);
        setDepartments([]);
      } finally {
        setLoadingDepartments(false);
      }
    };

    loadDepartments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend validation for required fields
    const requiredFields = [
      "employeeId", "firstName", "lastName", "gender",
      "maritalStatus", "email", "phone", "aadhaarNumber", "panNumber",
      "officeAddress", "companyName", "department", "position", "employmentType",
      "reportingSupervisor", "paymentMode", "bankName",
      "bankAccountNumber", "bankIFSCCode", "emergencyContactName",
      "emergencyContactNumber",
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        toast({
          title: "Validation Error",
          description: `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Specific validation for date fields
    if (!formData.dateOfBirth) {
      toast({
        title: "Validation Error",
        description: "Date of Birth is required.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.joiningDate) {
      toast({
        title: "Validation Error",
        description: "Joining Date is required.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for API call, converting types as needed
    const employeeData = {
      ...formData,
      phone: formData.phone ? Number(formData.phone) : null,
      aadhaarNumber: formData.aadhaarNumber ? Number(formData.aadhaarNumber) : null,
      fatherPhone: formData.fatherPhone ? Number(formData.fatherPhone) : null,
      motherPhone: formData.motherPhone ? Number(formData.motherPhone) : null,
      bankAccountNumber: formData.bankAccountNumber,
      emergencyContactNumber: formData.emergencyContactNumber ? Number(formData.emergencyContactNumber) : null,
      dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
      joiningDate: formData.joiningDate ? new Date(formData.joiningDate).toISOString() : null,
    };

    try {
      await apiClient.post("/employees/create", employeeData);
      toast({
        title: "Success",
        description: "Employee created successfully.",
      });
      navigate("/employees");
    } catch (error) {
      let errorMessage = "Failed to create employee.";
      if (error?.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
        } else if (typeof error.response.data.errors === 'object') {
          errorMessage = Object.values(error.response.data.errors).join(', ');
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Add New Employee</h1>
        <BackButton />
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LabelInputContainer>
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="gender">Gender</Label>
                <Select
                  onValueChange={(value) => handleSelectChange("gender", value)}
                  required
                >
                  <SelectTrigger>
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
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <EnhancedDOBPicker
                  value={formData.dateOfBirth}
                  onChange={handleDateOfBirthChange}
                  required
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="maritalStatus">Marital Status</Label>
                <Select
                  onValueChange={(value) =>
                    handleSelectChange("maritalStatus", value)
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                  </SelectContent>
                </Select>
              </LabelInputContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LabelInputContainer>
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="emergencyContactName">
                  Emergency Contact Name
                </Label>
                <Input
                  id="emergencyContactName"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  required
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="emergencyContactNumber">
                  Emergency Contact Number
                </Label>
                <Input
                  type="tel"
                  id="emergencyContactNumber"
                  name="emergencyContactNumber"
                  value={formData.emergencyContactNumber}
                  onChange={handleChange}
                  required
                />
              </LabelInputContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Identity & Family</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LabelInputContainer>
                <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
                <Input
                  id="aadhaarNumber"
                  name="aadhaarNumber"
                  value={formData.aadhaarNumber}
                  onChange={handleChange}
                  required
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="panNumber">PAN Number</Label>
                <Input
                  id="panNumber"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleChange}
                  required
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="fatherName">Father's Name</Label>
                <Input
                  id="fatherName"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                />
              </LabelInputContainer>              
              <LabelInputContainer>
                <Label htmlFor="fatherPhone">Father's Phone</Label>
                <Input
                  type="tel"
                  id="fatherPhone"
                  name="fatherPhone"
                  value={formData.fatherPhone}
                  onChange={handleChange}
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="motherName">Mother's Name</Label>
                <Input
                  id="motherName"
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleChange}
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="motherPhone">Mother's Phone</Label>
                <Input
                  type="tel"
                  id="motherPhone"
                  name="motherPhone"
                  value={formData.motherPhone}
                  onChange={handleChange}
                />
              </LabelInputContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Official Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LabelInputContainer>
                <Label htmlFor="joiningDate">Joining Date</Label>
                <EnhancedJoiningPicker
                  value={formData.joiningDate}
                  onChange={handleJoiningDateChange}
                  required
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="officeAddress">Office Address</Label>
                <Select
                  onValueChange={(value) =>
                    handleSelectChange("officeAddress", value)
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select office address" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SanikColony">Sanik Colony</SelectItem>
                    <SelectItem value="Indore">Indore</SelectItem>
                    <SelectItem value="N.F.C.">N.F.C.</SelectItem>
                  </SelectContent>
                </Select>
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="companyName">Company Name</Label>
                <Select
                  onValueChange={(value) =>
                    handleSelectChange("companyName", value)
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indra Financial Services Limited">
                      Indra Financial Services Limited
                    </SelectItem>
                    <SelectItem value="COSMOS INVESTIFIASSET MANAGEMENT LLP">
                      COSMOS INVESTIFIASSET MANAGEMENT LLP
                    </SelectItem>
                    <SelectItem value="SENSIBLE TAX ADVISORY LLP">
                      SENSIBLE TAX ADVISORY LLP
                    </SelectItem>
                  </SelectContent>
                </Select>
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="department">Department</Label>
                <Select
                  onValueChange={(value) => handleSelectChange("department", value)}
                  value={formData.department}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingDepartments ? "Loading departments..." : "Select department"} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length > 0 ? (
                      departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-departments" disabled>
                        {loadingDepartments ? "Loading..." : "No departments available"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="employmentType">Employment Type</Label>
                <Select
                  onValueChange={(value) =>
                    handleSelectChange("employmentType", value)
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fulltime">Full-time</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="reportingSupervisor">
                  Reporting Supervisor
                </Label>
                <Input
                  id="reportingSupervisor"
                  name="reportingSupervisor"
                  value={formData.reportingSupervisor}
                  onChange={handleChange}
                  required
                />
              </LabelInputContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LabelInputContainer>
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <Select
                  name="paymentMode"
                  onValueChange={(value) =>
                    handleSelectChange("paymentMode", value)
                  }
                  required
                >
                  <SelectTrigger id="paymentMode">
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  required
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
                <Input
                  id="bankAccountNumber"
                  name="bankAccountNumber"
                  value={formData.bankAccountNumber}
                  onChange={handleChange}
                  required
                />
              </LabelInputContainer>
              <LabelInputContainer>
                <Label htmlFor="bankIFSCCode">Bank IFSC Code</Label>
                <Input
                  id="bankIFSCCode"
                  name="bankIFSCCode"
                  value={formData.bankIFSCCode}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                />
              </LabelInputContainer>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" className="w-full md:w-auto">
            Create Employee
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddEmployee;

const LabelInputContainer = ({ children, className }) => {
  return (
    <div className={cn("flex w-full flex-col space-y-2", className)}>
      {children}
    </div>
  );
};
