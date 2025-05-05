import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, Phone, Mail, Building, Calendar, CreditCard, Users, HeartPulse, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

// API client setup
const apiClient = {
  getProfile: async () => {
    const response = await fetch("http://localhost:4000/api/employees/profile", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${sessionStorage.getItem("authToken")}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    return response.json();
  }
};

export default function GetProfile() {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmployeeData = async () => {
      const token = sessionStorage.getItem("authToken");
      if (!token) {
        navigate("/auth/login", { replace: true }); // REDIRECT IF TOKEN MISSING
        return;
      }
      try {
        console.log("Token in sessionStorage:", token);
        setLoading(true);
        const data = await apiClient.getProfile();
        setEmployee(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        if (err.message.includes("403")) {
          navigate("/auth/login", { replace: true }); // REDIRECT ON 403 ERROR
        } else {
          setError("Failed to load employee profile. Please try again later.");
        }
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [navigate]);

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!employee) return "";
    return `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`;
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg text-gray-700 dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!employee) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      {/* Abstract background pattern */}
      <div className="fixed inset-0 z-0 opacity-5 dark:opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <pattern id="pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M0 50 L50 0 L100 50 L50 100 Z" fill="none" stroke="currentColor" strokeWidth="1"></path>
            <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1"></circle>
          </pattern>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern)"></rect>
        </svg>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Profile Header */}
        <Card className="mb-6 shadow-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-white dark:border-slate-700 shadow-lg">
                <AvatarImage src="" alt={`${employee.firstName} ${employee.lastName}`} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{getInitials()}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{employee.firstName} {employee.lastName}</h1>
                <p className="text-xl text-gray-600 dark:text-gray-300">{employee.position}</p>
                <p className="text-gray-500 dark:text-gray-400">{employee.department}</p>
                
                <div className="flex flex-col md:flex-row gap-4 mt-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Mail size={18} />
                    <span>{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Phone size={18} />
                    <span>{employee.phone}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Employee ID</p>
                <p className="text-lg font-medium dark:text-gray-200">{employee.employeeId}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Tabs */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid grid-cols-3 w-full mb-6">
            <TabsTrigger value="personal">Personal Information</TabsTrigger>
            <TabsTrigger value="employment">Employment Details</TabsTrigger>
            <TabsTrigger value="financial">Financial Information</TabsTrigger>
          </TabsList>
          
          {/* Personal Information Tab */}
          <TabsContent value="personal">
            <Card className="shadow-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                  <User size={20} />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoField label="First Name" value={employee.firstName} />
                  <InfoField label="Last Name" value={employee.lastName} />
                  <InfoField label="Gender" value={employee.gender} />
                  <InfoField label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
                  <InfoField label="Marital Status" value={employee.maritalStatus} />
                  <InfoField label="Father's Name" value={employee.fatherName} />
                  <InfoField label="Mother's Name" value={employee.motherName} />
                </div>
                
                <Separator className="dark:bg-slate-700" />
                
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4 dark:text-gray-200">
                    <Building size={18} />
                    Address
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">{employee.address}</p>
                </div>
                
                <Separator className="dark:bg-slate-700" />
                
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4 dark:text-gray-200">
                    <Users size={18} />
                    Emergency Contact
                  </h3>
                  <InfoField label="Name" value={employee.emergencyContactName || "Not provided"} />
                  <InfoField label="Phone" value={employee.emergencyContactNumber || "Not provided"} />
                </div>
                
                <Separator className="dark:bg-slate-700" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoField label="Aadhaar Number" value={employee.aadhaarNumber} />
                  <InfoField label="PAN Number" value={employee.panNumber} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Employment Details Tab */}
          <TabsContent value="employment">
            <Card className="shadow-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                  <Building size={20} />
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoField label="Department" value={employee.department} />
                  <InfoField label="Position" value={employee.position} />
                  <InfoField label="Employment Type" value={employee.employmentType} />
                  <InfoField label="Joining Date" value={formatDate(employee.joiningDate)} />
                  <InfoField label="Reporting Supervisor" value={employee.reportingSupervisor} />
                </div>
                
                <Separator className="dark:bg-slate-700" />
                
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4 dark:text-gray-200">
                    <Building size={18} />
                    Office Address
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">{employee.officeAddress}</p>
                </div>
                
                <Separator className="dark:bg-slate-700" />
                
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4 dark:text-gray-200">
                    <Calendar size={18} />
                    Status
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${employee.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-gray-600 dark:text-gray-300">{employee.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Financial Information Tab */}
          <TabsContent value="financial">
            <Card className="shadow-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                  <CreditCard size={20} />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoField label="Salary" value={`₹${employee.salary?.toLocaleString() || '0'}`} />
                  <InfoField label="Payment Mode" value={employee.paymentMode} />
                </div>
                
                <Separator className="dark:bg-slate-700" />
                
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4 dark:text-gray-200">
                    <CreditCard size={18} />
                    Bank Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoField label="Bank Name" value={employee.bankName} />
                    <InfoField label="Account Number" value={employee.bankAccountNumber} />
                    <InfoField label="IFSC Code" value={employee.bankIFSCCode} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="font-medium dark:text-gray-200">{value || "Not provided"}</p>
    </div>
  );
}