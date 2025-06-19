import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  User, Phone, Mail, Building, Calendar, CreditCard, 
  Users, HeartPulse, Loader2, MapPin, Award, Briefcase, 
  Clock, DollarSign, Shield, Edit, Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// API client setup
const apiClient = {
  getProfile: async () => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
    const response = await fetch(`${apiUrl}/employees/profile`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
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
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/auth/login", { replace: true }); // REDIRECT IF TOKEN MISSING
        return;
      }
      try {
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
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
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
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 p-3 sm:p-6">
      {/* Abstract background pattern */}
      <div className="fixed pointer-events-none inset-0 -z-20 opacity-5 dark:opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
            <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <rect width="80" height="80" fill="url(#smallGrid)" />
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        
        {/* Profile Header */}
        <Card className="mb-6 shadow-md bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-t-4 border-primary">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-white dark:border-slate-700 shadow-lg">
                  <AvatarImage src="" alt={`${employee.firstName} ${employee.lastName}`} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-green-500 border-2 border-white dark:border-slate-700 flex items-center justify-center">
                  <Shield size={14} className="text-white" />
                </div>
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">{employee.firstName} {employee.lastName}</h1>
                    <div className="flex items-center justify-center md:justify-start mt-1 text-gray-600 dark:text-gray-300">
                      <Briefcase size={16} className="mr-1.5" />
                      <p className="text-lg">{employee.position}</p>
                    </div>
                    <div className="flex items-center justify-center md:justify-start mt-1 text-gray-500 dark:text-gray-400">
                      <Building size={14} className="mr-1.5" />
                      <p>{employee.department}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 md:mt-0 bg-primary/10 dark:bg-primary/20 p-3 sm:p-4 rounded-lg flex flex-col items-center">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Employee ID</p>
                    <p className="text-lg font-medium text-gray-800 dark:text-gray-200">{employee.employeeId}</p>
                    <div className="flex items-center mt-1 text-xs text-green-600 dark:text-green-400">
                      <Clock size={12} className="mr-1" />
                      <span>Active Employee</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4 mt-4">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-md text-gray-600 dark:text-gray-300">
                    <Mail size={14} />
                    <span className="text-sm">{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-md text-gray-600 dark:text-gray-300">
                    <Phone size={14} />
                    <span className="text-sm">{employee.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard 
            icon={<Calendar className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
            label="Joined"
            value={formatDate(employee.joiningDate)?.split(" ")[0] || "N/A"} 
            sublabel={formatDate(employee.joiningDate)?.split(" ")[2] || ""}
          />
          <StatCard 
            icon={<Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
            label="Team"
            value={employee.department} 
            sublabel="Department"
          />
          <StatCard 
            icon={<HeartPulse className="h-5 w-5 text-red-600 dark:text-red-400" />}
            label="Leave Balance"
            value="12 days" 
            sublabel="Annual"
          />
          <StatCard 
            icon={<Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            label="Performance"
            value="Excellent" 
            sublabel="Last Review"
          />
        </div>

        {/* Profile Tabs */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid grid-cols-3 w-full mb-6 p-1 bg-white dark:bg-slate-800 rounded-lg shadow-md">
            <TabsTrigger value="personal" className="data-[state=active]:bg-primary/10 dark:data-[state=active]:bg-primary/20">
              <User size={16} className="mr-2" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="employment" className="data-[state=active]:bg-primary/10 dark:data-[state=active]:bg-primary/20">
              <Briefcase size={16} className="mr-2" />
              Employment
            </TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-primary/10 dark:data-[state=active]:bg-primary/20">
              <DollarSign size={16} className="mr-2" />
              Financial
            </TabsTrigger>
          </TabsList>
          
          {/* Personal Information Tab */}
          <TabsContent value="personal">
            <Card className="shadow-md bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                  <User size={20} />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <InfoField icon={<User size={16} />} label="First Name" value={employee.firstName} />
                  <InfoField icon={<User size={16} />} label="Last Name" value={employee.lastName} />
                  <InfoField icon={<Users size={16} />} label="Gender" value={employee.gender} />
                  <InfoField icon={<Calendar size={16} />} label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
                  <InfoField icon={<Heart size={16} />} label="Marital Status" value={employee.maritalStatus} />
                  <InfoField icon={<User size={16} />} label="Father's Name" value={employee.fatherName} />
                  <InfoField icon={<User size={16} />} label="Mother's Name" value={employee.motherName} />
                </div>
                
                <Separator className="dark:bg-slate-700" />
                
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4 text-gray-800 dark:text-gray-200">
                    <MapPin size={18} />
                    Address
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-300">{employee.address}</p>
                  </div>
                </div>
                
                <Separator className="dark:bg-slate-700" />
                
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4 text-gray-800 dark:text-gray-200">
                    <Phone size={18} className="text-red-500 dark:text-red-400" />
                    Emergency Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <InfoField icon={<User size={16} />} label="Name" value={employee.emergencyContactName || "Not provided"} />
                    <InfoField icon={<Phone size={16} />} label="Phone" value={employee.emergencyContactNumber || "Not provided"} />
                  </div>
                </div>
                
                <Separator className="dark:bg-slate-700" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <InfoField icon={<CreditCard size={16} />} label="Aadhaar Number" value={employee.aadhaarNumber} />
                  <InfoField icon={<CreditCard size={16} />} label="PAN Number" value={employee.panNumber} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Employment Details Tab */}
          <TabsContent value="employment">
            <Card className="shadow-md bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                  <Building size={20} />
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <InfoField icon={<Building size={16} />} label="Department" value={employee.department} />
                  <InfoField icon={<Briefcase size={16} />} label="Position" value={employee.position} />
                  <InfoField icon={<Clock size={16} />} label="Employment Type" value={employee.employmentType} />
                  <InfoField icon={<Calendar size={16} />} label="Joining Date" value={formatDate(employee.joiningDate)} />
                  <InfoField icon={<User size={16} />} label="Reporting Manager" value={employee.reportingSupervisor} />
                  <InfoField icon={<Shield size={16} />} label="Status" 
                    value={
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${employee.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span>{employee.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    } 
                  />
                </div>
                
                <Separator className="dark:bg-slate-700" />
                
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4 text-gray-800 dark:text-gray-200">
                    <Building size={18} />
                    Office Address
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-300">{employee.officeAddress}</p>
                  </div>
                </div>
                
                <Separator className="dark:bg-slate-700" />
                
                <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-lg border-l-4 border-cyan-500 dark:border-cyan-400">
                  <h3 className="text-lg font-medium text-cyan-700 dark:text-cyan-300 mb-2">Employment Milestones</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                      <Award size={16} />
                      <span className="text-sm">Joined the company on {formatDate(employee.joiningDate)}</span>
                    </li>
                    <li className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                      <Award size={16} />
                      <span className="text-sm">Completed 1 year on {formatDate(new Date(new Date(employee.joiningDate).setFullYear(new Date(employee.joiningDate).getFullYear() + 1)))}</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Financial Information Tab */}
          <TabsContent value="financial">
            <Card className="shadow-md bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                  <CreditCard size={20} />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <InfoField icon={<DollarSign size={16} />} label="Payment Mode" value={employee.paymentMode || "Not provided"} />
                  <InfoField icon={<CreditCard size={16} />} label="Bank Account" value={employee.bankAccountNumber ? `XXXX ${String(employee.bankAccountNumber).slice(-4)}` : "Not provided"} />
                  <InfoField icon={<Building size={16} />} label="Bank Name" value={employee.bankName || "Not provided"} />
                  <InfoField icon={<CreditCard size={16} />} label="IFSC Code" value={employee.bankIFSCCode || "Not provided"} />
                </div>
                
                {!employee.bankName && !employee.bankAccountNumber && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg w-full max-w-md">
                      <CreditCard className="h-10 w-10 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-yellow-700 dark:text-yellow-300 mb-2">Financial Information Not Available</h3>
                      <p className="text-yellow-600 dark:text-yellow-400">Your financial details have not been added to the system yet. Please contact HR for more information.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InfoField({ icon, label, value }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm flex items-center gap-1.5 font-medium text-gray-500 dark:text-gray-400">
        {icon}
        {label}
      </label>
      <div className="bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-md text-gray-700 dark:text-gray-200">
        {typeof value === 'string' ? value : value}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sublabel }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-3 sm:p-4 flex flex-col items-center text-center">
      <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full mb-2">
        {icon}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">{value}</p>
      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{sublabel}</p>
    </div>
  );
}

function Heart(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}