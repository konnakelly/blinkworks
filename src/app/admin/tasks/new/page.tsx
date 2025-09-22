"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Upload, Link as LinkIcon, X, Plus, FileText, Image, Video, Zap, Palette, Globe, File } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { createTask, createBrand, getBrandByUserId, Task, CreativeRequirements, Brand } from "@/lib/firestore";
import { RoleGuard } from "@/components/RoleGuard";
import Navbar from "@/components/Navbar";

export default function AdminCreateTaskPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "STATIC_DESIGN" as Task['type'],
    priority: "MEDIUM" as Task['priority'],
    deadline: "",
    clientEmail: "",
    clientName: "",
    companyName: "",
    companySize: "SMALL" as Brand['size']
  });

  const [requirements, setRequirements] = useState<CreativeRequirements>({
    contentType: [],
    format: [],
    style: "",
    colorPalette: [],
    mood: "",
    brandGuidelines: "",
    doNotUse: "",
    mustInclude: "",
    references: [],
    uploadedFiles: [],
    inspiration: ""
  });

  const [newLink, setNewLink] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRequirementsChange = (field: keyof CreativeRequirements, value: any) => {
    setRequirements(prev => ({ ...prev, [field]: value }));
  };

  const handleAddLink = () => {
    if (newLink.trim()) {
      setRequirements(prev => ({
        ...prev,
        references: [...prev.references, newLink.trim()]
      }));
      setNewLink("");
    }
  };

  const handleRemoveLink = (index: number) => {
    setRequirements(prev => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true);
    try {
      const fileArray = Array.from(files);
      setUploadedFiles(prev => [...prev, ...fileArray]);
      
      // For now, we'll just store the file objects
      // In a real implementation, you'd upload to Firebase Storage
      setRequirements(prev => ({
        ...prev,
        uploadedFiles: [...(prev.uploadedFiles || []), ...fileArray.map(file => ({
          name: file.name,
          downloadURL: URL.createObjectURL(file), // Temporary URL for preview
          size: file.size,
          type: file.type
        }))]
      }));
    } catch (error) {
      console.error("Error uploading files:", error);
      setError("Failed to upload files. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // First, create or get the brand for the client
      let brandId = brand?.id;
      
      if (!brandId) {
        // Create a new brand for the client
        const newBrand = await createBrand({
          name: formData.companyName,
          size: formData.companySize,
          userId: user.uid // Admin's ID for now
        });
        brandId = newBrand.id;
      }

      // Create the task
      const taskData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        status: 'SUBMITTED' as Task['status'],
        priority: formData.priority,
        deadline: formData.deadline ? new Date(formData.deadline) : undefined,
        brandId: brandId,
        userId: user.uid, // Admin's ID
        requirements: requirements,
        adminNotes: `Task created by admin for client: ${formData.clientName} (${formData.clientEmail})`
      };

      const task = await createTask(taskData);
      
      // Redirect to admin tasks list
      router.push("/admin/tasks");
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid var(--primary)', 
            borderTop: '4px solid transparent', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: 'var(--text-light)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <RoleGuard requiredRoles={['ADMIN']}>
      <div className="min-h-screen gradient-bg">
        <Navbar variant="admin" />
        
        <div className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <button
              onClick={() => router.back()}
              className="btn-ghost"
              style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
              Create Task (Admin)
            </h1>
            <p style={{ color: 'var(--text-light)' }}>
              Create a new task on behalf of a client
            </p>
          </div>

          {/* Progress Indicator */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '32px',
            background: 'white',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              flex: 1,
              color: currentStep >= 1 ? 'var(--primary)' : 'var(--text-light)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: currentStep >= 1 ? 'var(--primary)' : 'var(--surface)',
                color: currentStep >= 1 ? 'white' : 'var(--text-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                1
              </div>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Project Details</span>
            </div>
            
            <div style={{ 
              width: '40px', 
              height: '2px', 
              background: currentStep >= 2 ? 'var(--primary)' : 'var(--border)',
              margin: '0 16px'
            }}></div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              flex: 1,
              color: currentStep >= 2 ? 'var(--primary)' : 'var(--text-light)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: currentStep >= 2 ? 'var(--primary)' : 'var(--surface)',
                color: currentStep >= 2 ? 'white' : 'var(--text-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                2
              </div>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Review & Submit</span>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              {error}
            </div>
          )}

          {/* Step 1: Project Details */}
          {currentStep === 1 && (
            <div className="card" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px' }}>
                Project Details
              </h2>

              {/* Client Information */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
                  Client Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                      Client Name *
                    </label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => handleInputChange('clientName', e.target.value)}
                      placeholder="John Doe"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                      Client Email *
                    </label>
                    <input
                      type="email"
                      value={formData.clientEmail}
                      onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                      placeholder="john@company.com"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="Acme Corp"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                      Company Size
                    </label>
                    <select
                      value={formData.companySize}
                      onChange={(e) => handleInputChange('companySize', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px'
                      }}
                    >
                      <option value="STARTUP">Startup (1-10)</option>
                      <option value="SMALL">Small (11-50)</option>
                      <option value="MEDIUM">Medium (51-200)</option>
                      <option value="LARGE">Large (200+)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Task Information */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
                  Task Information
                </h3>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Create a new logo for our brand"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe what you need created..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                      Task Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px'
                      }}
                    >
                      <option value="STATIC_DESIGN">Static Design</option>
                      <option value="VIDEO_PRODUCTION">Video Production</option>
                      <option value="ANIMATION">Animation</option>
                      <option value="ILLUSTRATION">Illustration</option>
                      <option value="BRANDING">Branding</option>
                      <option value="WEB_DESIGN">Web Design</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px'
                      }}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => handleInputChange('deadline', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
                  Creative Requirements
                </h3>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                    Content Type
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {[
                      { value: 'LOGO', label: 'Logo', icon: FileText },
                      { value: 'POSTER', label: 'Poster', icon: Image },
                      { value: 'BROCHURE', label: 'Brochure', icon: FileText },
                      { value: 'SOCIAL_MEDIA', label: 'Social Media', icon: Image },
                      { value: 'WEBSITE', label: 'Website', icon: Globe },
                      { value: 'VIDEO', label: 'Video', icon: Video },
                      { value: 'ANIMATION', label: 'Animation', icon: Zap },
                      { value: 'ILLUSTRATION', label: 'Illustration', icon: Palette }
                    ].map((option) => {
                      const IconComponent = option.icon;
                      const isSelected = requirements.contentType.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            const newContentType = isSelected
                              ? requirements.contentType.filter(type => type !== option.value)
                              : [...requirements.contentType, option.value];
                            handleRequirementsChange('contentType', newContentType);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px',
                            borderRadius: '8px',
                            border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                            background: isSelected ? 'var(--primary-light-bg)' : 'var(--surface)',
                            color: isSelected ? 'var(--primary)' : 'var(--text)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          <IconComponent size={16} />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                    Style & Mood
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <input
                      type="text"
                      value={requirements.style || ''}
                      onChange={(e) => handleRequirementsChange('style', e.target.value)}
                      placeholder="Modern, minimalist, professional..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px'
                      }}
                    />
                    <input
                      type="text"
                      value={requirements.mood || ''}
                      onChange={(e) => handleRequirementsChange('mood', e.target.value)}
                      placeholder="Energetic, calm, trustworthy..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                    Brand Guidelines
                  </label>
                  <textarea
                    value={requirements.brandGuidelines || ''}
                    onChange={(e) => handleRequirementsChange('brandGuidelines', e.target.value)}
                    placeholder="Any specific brand guidelines or requirements..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                    Inspiration & References
                  </label>
                  <textarea
                    value={requirements.inspiration || ''}
                    onChange={(e) => handleRequirementsChange('inspiration', e.target.value)}
                    placeholder="What inspires this project? Any specific references or ideas..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Navigation */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                <button
                  onClick={nextStep}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review & Submit */}
          {currentStep === 2 && (
            <div className="card" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px' }}>
                Review & Submit
              </h2>

              {/* Client Information Review */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                  Client Information
                </h3>
                <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    <strong>Name:</strong> {formData.clientName}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    <strong>Email:</strong> {formData.clientEmail}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    <strong>Company:</strong> {formData.companyName}
                  </p>
                  <p style={{ margin: '0', fontSize: '14px' }}>
                    <strong>Size:</strong> {formData.companySize}
                  </p>
                </div>
              </div>

              {/* Task Information Review */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                  Task Information
                </h3>
                <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    <strong>Title:</strong> {formData.title}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    <strong>Type:</strong> {formData.type.replace('_', ' ')}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    <strong>Priority:</strong> {formData.priority}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    <strong>Deadline:</strong> {formData.deadline || 'No deadline set'}
                  </p>
                  <p style={{ margin: '0', fontSize: '14px' }}>
                    <strong>Description:</strong> {formData.description}
                  </p>
                </div>
              </div>

              {/* Requirements Review */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                  Creative Requirements
                </h3>
                <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    <strong>Content Type:</strong> {requirements.contentType.length > 0 ? requirements.contentType.join(', ') : 'None selected'}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    <strong>Style:</strong> {requirements.style || 'Not specified'}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    <strong>Mood:</strong> {requirements.mood || 'Not specified'}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    <strong>Brand Guidelines:</strong> {requirements.brandGuidelines || 'Not specified'}
                  </p>
                  <p style={{ margin: '0', fontSize: '14px' }}>
                    <strong>Inspiration:</strong> {requirements.inspiration || 'Not specified'}
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <button
                  onClick={prevStep}
                  className="btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <ArrowLeft size={16} />
                  Previous
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !formData.title || !formData.description || !formData.clientName || !formData.clientEmail || !formData.companyName}
                  className="btn-primary"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    opacity: (loading || !formData.title || !formData.description || !formData.clientName || !formData.clientEmail || !formData.companyName) ? 0.5 : 1,
                    cursor: (loading || !formData.title || !formData.description || !formData.clientName || !formData.clientEmail || !formData.companyName) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{ 
                        width: '16px', 
                        height: '16px', 
                        border: '2px solid white', 
                        borderTop: '2px solid transparent', 
                        borderRadius: '50%', 
                        animation: 'spin 1s linear infinite' 
                      }}></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Task
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
