import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Save,
  FileText,
  Filter,
  Calendar,
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw
} from "lucide-react";
import apiClient from "../../service/apiClient";
import { useToast } from "@/components/ui/toast";
import useAuth from "../../hooks/authjwt";
import BackButton from "../ui/BackButton";

const PoliciesPage = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Policy form state
  const [policyForm, setPolicyForm] = useState({
    title: '',
    content: '',
    category: 'General',
    priority: 'Medium',
    effectiveDate: '',
    expiryDate: '',
    targetAudience: 'All Employees',
    acknowledgmentRequired: false,
    tags: []
  });

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  const { toast } = useToast();
  const user = useAuth();

  // Load policies on component mount and when filters change
  useEffect(() => {
    loadPolicies();
  }, [pagination.currentPage, searchTerm, selectedCategory, selectedPriority, selectedStatus]);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory && selectedCategory !== 'all' && { category: selectedCategory }),
        ...(selectedPriority && selectedPriority !== 'all' && { priority: selectedPriority }),
        ...(selectedStatus === 'active' && { isActive: true }),
        ...(selectedStatus === 'inactive' && { isActive: false })
      };

      const response = await apiClient.getAllPolicies(params);
      if (response.success) {
        setPolicies(response.data.policies || []);
        setPagination(response.data.pagination || pagination);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to load policies",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field, value) => {
    setPolicyForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateNew = () => {
    setEditingPolicy(null);
    setPolicyForm({
      title: '',
      content: '',
      category: 'General',
      priority: 'Medium',
      effectiveDate: '',
      expiryDate: '',
      targetAudience: 'All Employees',
      acknowledgmentRequired: false,
      tags: []
    });
    setShowForm(true);
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setPolicyForm({
      title: policy.title,
      content: policy.content,
      category: policy.category,
      priority: policy.priority,
      effectiveDate: policy.effectiveDate ? new Date(policy.effectiveDate).toISOString().split('T')[0] : '',
      expiryDate: policy.expiryDate ? new Date(policy.expiryDate).toISOString().split('T')[0] : '',
      targetAudience: policy.targetAudience,
      acknowledgmentRequired: policy.acknowledgmentRequired,
      tags: policy.tags || []
    });
    setShowForm(true);
  };

  const handleDelete = async (policy) => {
    if (!window.confirm(`Are you sure you want to deactivate the policy "${policy.title}"?`)) {
      return;
    }

    try {
      await apiClient.deletePolicy(policy._id);
      
      // If viewing "All Policies", just update the status
      if (selectedStatus === 'all') {
        setPolicies(prevPolicies => 
          prevPolicies.map(p => 
            p._id === policy._id ? { ...p, isActive: false } : p
          )
        );
      } else {
        // If viewing filtered list, reload to maintain filter consistency
        loadPolicies();
      }
      
      toast({
        title: "Success",
        description: "Policy deactivated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate policy",
        variant: "destructive"
      });
      // Reload in case of error to restore consistent state
      loadPolicies();
    }
  };

  const handleRestore = async (policy) => {
    if (!window.confirm(`Are you sure you want to activate the policy "${policy.title}"?`)) {
      return;
    }

    try {
      await apiClient.updatePolicy(policy._id, { isActive: true });
      
      // If viewing "All Policies", just update the status
      if (selectedStatus === 'all') {
        setPolicies(prevPolicies => 
          prevPolicies.map(p => 
            p._id === policy._id ? { ...p, isActive: true } : p
          )
        );
      } else {
        // If viewing filtered list, reload to maintain filter consistency
        loadPolicies();
      }
      
      toast({
        title: "Success",
        description: "Policy activated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to activate policy",
        variant: "destructive"
      });
    }
  };

  const handlePermanentDelete = async (policy) => {
    if (!window.confirm(`⚠️ WARNING: This will permanently delete the policy "${policy.title}" from the database. This action CANNOT be undone. Are you absolutely sure?`)) {
      return;
    }

    // Double confirmation for permanent deletion
    if (!window.confirm(`This is your final warning. The policy "${policy.title}" will be PERMANENTLY DELETED. Type "DELETE" in the next prompt to confirm.`)) {
      return;
    }

    const userInput = window.prompt('Type "DELETE" (in capital letters) to confirm permanent deletion:');
    if (userInput !== 'DELETE') {
      toast({
        title: "Deletion Cancelled",
        description: "Policy was not deleted - confirmation text did not match."
      });
      return;
    }

    try {
      await apiClient.permanentDeletePolicy(policy._id);
      
      // Remove from local state
      setPolicies(prevPolicies => prevPolicies.filter(p => p._id !== policy._id));
      
      // Update pagination count
      setPagination(prev => ({
        ...prev,
        totalItems: Math.max(0, prev.totalItems - 1)
      }));
      
      toast({
        title: "Success",
        description: "Policy permanently deleted successfully"
      });
      
      // Reload to ensure data consistency
      loadPolicies();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to permanently delete policy",
        variant: "destructive"
      });
      // Reload in case of error to restore consistent state
      loadPolicies();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!policyForm.title || !policyForm.content) {
      toast({
        title: "Error",
        description: "Please fill in title and content",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const policyData = {
        ...policyForm,
        effectiveDate: policyForm.effectiveDate || new Date().toISOString(),
        expiryDate: policyForm.expiryDate || null
      };

      if (editingPolicy) {
        await apiClient.updatePolicy(editingPolicy._id, policyData);
        toast({
          title: "Success",
          description: "Policy updated successfully"
        });
      } else {
        await apiClient.createPolicy(policyData);
        toast({
          title: "Success",
          description: "Policy created successfully"
        });
      }

      setShowForm(false);
      loadPolicies();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to save policy",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFormBack = () => {
    setShowForm(false);
    setEditingPolicy(null);
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Low': 'text-gray-600 bg-gray-100',
      'Medium': 'text-blue-600 bg-blue-100',
      'High': 'text-orange-600 bg-orange-100',
      'Critical': 'text-red-600 bg-red-100'
    };
    return colors[priority] || colors['Medium'];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Show form component
  if (showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleFormBack}
              className="dark:border-slate-600 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  {editingPolicy ? 'Update policy information' : 'Add a new company policy'}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
            <CardHeader className="border-b border-slate-200 dark:border-slate-600">
              <CardTitle className="text-slate-900 dark:text-slate-100">
                Policy Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Policy Title *</Label>
                  <Input
                    placeholder="Enter policy title"
                    value={policyForm.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                    required
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Policy Content *</Label>
                  <textarea
                    className="w-full h-40 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 resize-vertical"
                    placeholder="Enter detailed policy content..."
                    value={policyForm.content}
                    onChange={(e) => handleFormChange('content', e.target.value)}
                    required
                  />
                </div>

                {/* Category and Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Category</Label>
                    <Select value={policyForm.category} onValueChange={(value) => handleFormChange('category', value)}>
                      <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                        {['General', 'HR', 'IT', 'Security', 'Leave', 'Attendance', 'Code of Conduct', 'Safety', 'Other'].map(cat => (
                          <SelectItem key={cat} value={cat} className="dark:text-slate-100 dark:focus:bg-slate-700">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Priority</Label>
                    <Select value={policyForm.priority} onValueChange={(value) => handleFormChange('priority', value)}>
                      <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                        {['Low', 'Medium', 'High', 'Critical'].map(priority => (
                          <SelectItem key={priority} value={priority} className="dark:text-slate-100 dark:focus:bg-slate-700">
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Target Audience */}
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Target Audience</Label>
                  <Select value={policyForm.targetAudience} onValueChange={(value) => handleFormChange('targetAudience', value)}>
                    <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                      {['All Employees', 'HR Only', 'Management Only', 'IT Team', 'Specific Departments'].map(audience => (
                        <SelectItem key={audience} value={audience} className="dark:text-slate-100 dark:focus:bg-slate-700">
                          {audience}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Effective Date</Label>
                    <Input
                      type="date"
                      value={policyForm.effectiveDate}
                      onChange={(e) => handleFormChange('effectiveDate', e.target.value)}
                      className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Expiry Date (Optional)</Label>
                    <Input
                      type="date"
                      value={policyForm.expiryDate}
                      onChange={(e) => handleFormChange('expiryDate', e.target.value)}
                      className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Acknowledgment Required */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="acknowledgmentRequired"
                    checked={policyForm.acknowledgmentRequired}
                    onChange={(e) => handleFormChange('acknowledgmentRequired', e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600"
                  />
                  <Label htmlFor="acknowledgmentRequired" className="text-slate-700 dark:text-slate-300">
                    Require employee acknowledgment
                  </Label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFormBack}
                    className="dark:border-slate-600 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || !policyForm.title || !policyForm.content}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingPolicy ? 'Update Policy' : 'Create Policy'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <BackButton onClick={onBack || (() => {})} label="Back" variant="ghost" className="w-auto" />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Company Policies
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Manage and maintain company policies and procedures
                </p>
              </div>
            </div>
            
            <Button
              onClick={handleCreateNew}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Policy
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-600">
            <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search policies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                  <SelectItem value="all" className="dark:text-slate-100">All Categories</SelectItem>
                  {['General', 'HR', 'IT', 'Security', 'Leave', 'Attendance', 'Code of Conduct', 'Safety', 'Other'].map(cat => (
                    <SelectItem key={cat} value={cat} className="dark:text-slate-100 dark:focus:bg-slate-700">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                  <SelectItem value="all" className="dark:text-slate-100">All Priorities</SelectItem>
                  {['Low', 'Medium', 'High', 'Critical'].map(priority => (
                    <SelectItem key={priority} value={priority} className="dark:text-slate-100 dark:focus:bg-slate-700">
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                  <SelectValue placeholder="Policy Status" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                  <SelectItem value="all" className="dark:text-slate-100">All Policies</SelectItem>
                  <SelectItem value="active" className="dark:text-slate-100">Active Only</SelectItem>
                  <SelectItem value="inactive" className="dark:text-slate-100">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Policies Table */}
        <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-600">
            <CardTitle className="text-slate-900 dark:text-slate-100">
              Policies ({pagination.totalItems})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : policies.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 text-lg">No policies found</p>
                <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">
                  Create your first company policy to get started
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-600">
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Title</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Category</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Priority</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Target</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Created</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policies.map((policy) => (
                        <tr key={policy._id} className="border-b border-slate-100 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-slate-100">
                                {policy.title}
                              </p>
                              {policy.acknowledgmentRequired && (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                                  <AlertTriangle className="h-3 w-3" />
                                  Acknowledgment Required
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-600 dark:text-slate-200">
                              {policy.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(policy.priority)}`}>
                              {policy.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              policy.isActive !== false 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              {policy.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span className="text-sm">{policy.targetAudience}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span className="text-sm">{formatDate(policy.createdAt)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(policy)}
                                className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                title="Edit"
                                disabled={policy.isActive === false}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {policy.isActive !== false ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(policy)}
                                  className="h-8 w-8 p-0 text-slate-600 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400"
                                  title="Deactivate Policy"
                                >
                                  <EyeOff className="h-4 w-4" />
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRestore(policy)}
                                    className="h-8 w-8 p-0 text-slate-600 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400"
                                    title="Activate Policy"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePermanentDelete(policy)}
                                    className="h-8 w-8 p-0 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                                    title="Permanently Delete Policy"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200 dark:border-slate-600">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                      {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                      {pagination.totalItems} results
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="dark:border-slate-600 dark:hover:bg-slate-600"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <span className="text-sm text-slate-600 dark:text-slate-400 px-3">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="dark:border-slate-600 dark:hover:bg-slate-600"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PoliciesPage;