"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Upload, X, CheckCircle, Sparkles, FileText, Settings, Eye, File, Image, Video } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { createTask, getBrandByUserId, CreativeRequirements, uploadFile } from "@/lib/firestore";
import { db } from "@/lib/firebase";

export default function NewTask() {
  const { user, userProfile, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    deadline: "",
  });
  const [requirements, setRequirements] = useState<CreativeRequirements>({
    contentType: [],
    dimensions: "",
    format: [],
    style: "",
    colorPalette: [],
    mood: "",
    brandGuidelines: "",
    doNotUse: "",
    mustInclude: "",
    fileSize: "",
    resolution: "",
    references: [],
    inspiration: "",
  });
  const [referenceUrl, setReferenceUrl] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  // Force black text on all form elements and review content
  useEffect(() => {
    const forceBlackText = () => {
      // Force form elements
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((element: any) => {
        element.style.color = '#000000';
        element.style.backgroundColor = '#ffffff';
        element.style.webkitTextFillColor = '#000000';
      });

      // Force all text elements to be black
      const textElements = document.querySelectorAll('p, span, div, li, td, th, label, h1, h2, h3, h4, h5, h6');
      textElements.forEach((element: any) => {
        element.style.color = '#000000';
        element.style.webkitTextFillColor = '#000000';
      });

      // Force all content in review sections
      const reviewSections = document.querySelectorAll('.bg-gray-50, .space-y-2, .space-y-6');
      reviewSections.forEach((section: any) => {
        section.style.color = '#000000';
        const children = section.querySelectorAll('*');
        children.forEach((child: any) => {
          child.style.color = '#000000';
          child.style.webkitTextFillColor = '#000000';
        });
      });
    };

    // Run immediately
    forceBlackText();

    // Run after a short delay to catch dynamically added elements
    setTimeout(forceBlackText, 100);
    setTimeout(forceBlackText, 500);
    setTimeout(forceBlackText, 1000);
  }, []);

  const contentTypes = [
    { value: "static", label: "Static Image" },
    { value: "video", label: "Video" },
    { value: "animation", label: "Animation" },
    { value: "illustration", label: "Illustration" },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRequirementsChange = (field: keyof CreativeRequirements, value: any) => {
    setRequirements(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayToggle = (field: keyof CreativeRequirements, value: string) => {
    const currentArray = requirements[field] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    handleRequirementsChange(field, newArray);
  };

  const addReference = () => {
    if (referenceUrl.trim()) {
      let url = referenceUrl.trim();
      // Ensure URL has protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      const newReferences = [...requirements.references, url];
      handleRequirementsChange("references", newReferences);
      setReferenceUrl("");
    }
  };

  const removeReference = (index: number) => {
    const newReferences = requirements.references.filter((_, i) => i !== index);
    handleRequirementsChange("references", newReferences);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).filter(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      
      // Check file type
      const allowedTypes = ['image/', 'video/', 'application/pdf', 'text/', 'application/msword', 'application/vnd.openxmlformats-officedocument.'];
      const isValidType = allowedTypes.some(type => file.type.startsWith(type));
      
      if (!isValidType) {
        alert(`File ${file.name} is not a supported file type.`);
        return false;
      }
      
      return true;
    });
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image size={20} />;
    if (file.type.startsWith('video/')) return <Video size={20} />;
    return <File size={20} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get user's brand
      const brand = await getBrandByUserId(user.uid);
      if (!brand) {
        throw new Error("Brand not found. Please complete your profile first.");
      }

          // Create task first to get task ID
          const taskData: any = {
            title: formData.title,
            description: formData.description,
            type: "STATIC_DESIGN", // Default type
            priority: "MEDIUM", // Default priority
            brandId: brand.id,
            userId: user.uid,
            status: "SUBMITTED",
            requirements: {
              ...requirements
            },
          };

          // Only add deadline if it exists
          if (formData.deadline) {
            taskData.deadline = new Date(formData.deadline);
          }

          // Create task to get task ID
          const taskRef = await createTask(taskData);
          const taskId = taskRef.id;

          // Upload files if any
          if (uploadedFiles.length > 0) {
            const uploadedFilesData = await Promise.all(
              uploadedFiles.map(async (file) => {
                const downloadURL = await uploadFile(file, taskId);
                return {
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  downloadURL: downloadURL
                };
              })
            );

            // Update task with uploaded files data
            const updatedRequirements = {
              ...requirements,
              uploadedFiles: uploadedFilesData
            };

            // Update the task with file data
            const { updateDoc } = await import('firebase/firestore');
            const { doc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'tasks', taskId), {
              requirements: updatedRequirements
            });
          }

      router.push("/dashboard");
    } catch (error: any) {
      console.error("Task creation error:", error);
      setError(error.message || "An error occurred while creating the task. Please try again.");
    } finally {
      setIsLoading(false);
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
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            background: 'var(--primary-light-bg)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 16px',
            animation: 'pulse 2s infinite'
          }}>
            <Sparkles size={24} color="var(--primary)" />
          </div>
          <p style={{ fontSize: '18px', color: 'var(--text)', margin: 0 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Navigation */}
      <nav className="nav-container">
        <div className="nav-content">
          <div className="nav-brand">
            <div className="nav-logo">
              <Sparkles size={20} color="white" />
            </div>
            <span className="nav-brand-text">BlinkWorks</span>
          </div>
          <div className="nav-auth-desktop">
            <Link href="/dashboard" className="btn-ghost">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
        {/* Header */}
        <div className="card" style={{ marginBottom: '32px', textAlign: 'center', padding: '32px' }}>
          <div style={{ 
            width: '72px', 
            height: '72px', 
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
            borderRadius: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 24px' 
          }}>
            <FileText size={36} color="white" />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '12px' }}>
            Create New Task
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-light)', margin: 0 }}>
            Tell us about your creative project and we'll match you with the perfect talent
          </p>
        </div>

        {/* Progress Steps */}
        <div className="card" style={{ marginBottom: '32px', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: currentStep >= 1 ? 'var(--primary)' : 'var(--surface)',
                color: currentStep >= 1 ? 'white' : 'var(--text-light)',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                {currentStep > 1 ? <CheckCircle size={24} /> : '1'}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>Project Details</div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Basic info & requirements</div>
              </div>
            </div>
            
            <div style={{ 
              width: '60px', 
              height: '2px', 
              background: currentStep >= 2 ? 'var(--primary)' : 'var(--border)'
            }}></div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: currentStep >= 2 ? 'var(--primary)' : 'var(--surface)',
                color: currentStep >= 2 ? 'white' : 'var(--text-light)',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                2
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>Review</div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Final check</div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: '32px' }}>
          {error && (
            <div style={{ 
              background: 'var(--error-light-bg)', 
              border: '1px solid var(--error)', 
              color: 'var(--error)', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <X size={20} />
              {error}
            </div>
          )}

          {/* Step 1: Project Details (Basic Info + Requirements) */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  background: 'var(--primary-light-bg)', 
                  borderRadius: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 16px' 
                }}>
                  <Settings size={28} color="var(--primary)" />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
                  Project Details
                </h2>
                <p style={{ fontSize: '16px', color: 'var(--text-light)', margin: 0 }}>
                  Tell us about your project and creative requirements
                </p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
                <div>
                  <label htmlFor="title" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    Task Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="e.g., Social Media Campaign Graphics"
                  />
                </div>

                <div>
                  <label htmlFor="description" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="textarea"
                    placeholder="Describe what you need created..."
                  />
                </div>

                <div>
                  <label htmlFor="deadline" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    Deadline (Optional)
                  </label>
                  <input
                    type="date"
                    id="deadline"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                    className="input"
                    style={{
                      cursor: 'pointer',
                      colorScheme: 'light',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  />
                </div>

                {/* Requirements Section */}
                <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px' }}>
                    Creative Requirements
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                        Content Type
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        {contentTypes.map((type) => (
                          <label key={type.value} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '12px 16px', 
                            background: 'var(--surface)', 
                            borderRadius: '12px', 
                            border: '2px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}>
                            <input
                              type="checkbox"
                              checked={requirements.contentType.includes(type.value)}
                              onChange={() => handleArrayToggle("contentType", type.value)}
                              style={{ 
                                width: '18px', 
                                height: '18px', 
                                accentColor: 'var(--primary)',
                                marginRight: '12px'
                              }}
                            />
                            <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: '500' }}>{type.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>


                    <div>
                      <label htmlFor="brandGuidelines" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                        Brand Guidelines
                      </label>
                      <textarea
                        id="brandGuidelines"
                        rows={3}
                        value={requirements.brandGuidelines}
                        onChange={(e) => handleRequirementsChange("brandGuidelines", e.target.value)}
                        className="textarea"
                        placeholder="Any specific brand guidelines or requirements..."
                      />
                    </div>

                    <div>
                      <label htmlFor="mustInclude" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                        Must Include
                      </label>
                      <textarea
                        id="mustInclude"
                        rows={2}
                        value={requirements.mustInclude}
                        onChange={(e) => handleRequirementsChange("mustInclude", e.target.value)}
                        className="textarea"
                        placeholder="Elements that must be included..."
                      />
                    </div>

                    <div>
                      <label htmlFor="doNotUse" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                        Do Not Use
                      </label>
                      <textarea
                        id="doNotUse"
                        rows={2}
                        value={requirements.doNotUse}
                        onChange={(e) => handleRequirementsChange("doNotUse", e.target.value)}
                        className="textarea"
                        placeholder="Elements to avoid or not use..."
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                        Reference Files
                      </label>
                      <p style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '12px', fontStyle: 'italic' }}>
                        Upload files for inspiration, style references, or to provide additional context for the designer
                      </p>
                      <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        style={{
                          border: `2px dashed ${isDragOver ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: '12px',
                          padding: '32px',
                          textAlign: 'center',
                          background: isDragOver ? 'var(--primary-light-bg)' : 'var(--surface)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          marginBottom: '16px'
                        }}
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                          onChange={(e) => handleFileUpload(e.target.files)}
                          style={{ display: 'none' }}
                        />
                        <div style={{ 
                          width: '48px', 
                          height: '48px', 
                          background: isDragOver ? 'var(--primary)' : 'var(--primary-light-bg)', 
                          borderRadius: '12px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          margin: '0 auto 16px',
                          transition: 'all 0.2s ease'
                        }}>
                          <Upload size={24} color={isDragOver ? 'white' : 'var(--primary)'} />
                        </div>
                        <h3 style={{ 
                          fontSize: '16px', 
                          fontWeight: '600', 
                          color: 'var(--text)', 
                          marginBottom: '8px' 
                        }}>
                          {isDragOver ? 'Drop files here' : 'Upload reference files'}
                        </h3>
                        <p style={{ 
                          fontSize: '14px', 
                          color: 'var(--text-light)', 
                          marginBottom: '16px' 
                        }}>
                          Drag and drop files here, or click to browse
                        </p>
                        <div style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-light)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <span>Supported: Images, Videos, PDF, Documents</span>
                          <span>Max size: 10MB per file</span>
                        </div>
                      </div>
                      
                      {uploadedFiles.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {uploadedFiles.map((file, index) => (
                            <div key={index} style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              background: 'var(--surface)', 
                              padding: '12px 16px', 
                              borderRadius: '12px',
                              border: '1px solid var(--border)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                <div style={{ 
                                  color: 'var(--primary)',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}>
                                  {getFileIcon(file)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: '500',
                                    color: 'var(--text)',
                                    marginBottom: '2px',
                                    wordBreak: 'break-all'
                                  }}>
                                    {file.name}
                                  </div>
                                  <div style={{ 
                                    fontSize: '12px', 
                                    color: 'var(--text-light)' 
                                  }}>
                                    {formatFileSize(file.size)}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                style={{ 
                                  color: 'var(--error)', 
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                        Reference Links
                      </label>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <input
                          type="url"
                          value={referenceUrl}
                          onChange={(e) => setReferenceUrl(e.target.value)}
                          className="input"
                          placeholder="Add reference URL..."
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={addReference}
                          className="btn-primary"
                          style={{ padding: '12px 20px' }}
                        >
                          Add
                        </button>
                      </div>
                      {requirements.references.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {requirements.references.map((ref, index) => (
                            <div key={index} style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              background: 'var(--surface)', 
                              padding: '12px 16px', 
                              borderRadius: '12px',
                              border: '1px solid var(--border)'
                            }}>
                              <a
                                href={ref.startsWith('http') ? ref : `https://${ref}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ 
                                  fontSize: '14px', 
                                  color: 'var(--primary)', 
                                  textDecoration: 'none',
                                  flex: 1,
                                  marginRight: '12px',
                                  wordBreak: 'break-all'
                                }}
                              >
                                {ref}
                              </a>
                              <button
                                type="button"
                                onClick={() => removeReference(index)}
                                style={{ 
                                  color: 'var(--error)', 
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Step 2: Review */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  background: 'var(--primary-light-bg)', 
                  borderRadius: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 16px' 
                }}>
                  <Eye size={28} color="var(--primary)" />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
                  Review Your Task
                </h2>
                <p style={{ fontSize: '16px', color: 'var(--text-light)', margin: 0 }}>
                  Review all details before creating your task
                </p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                    Content Type
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    {contentTypes.map((type) => (
                      <label key={type.value} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '12px 16px', 
                        background: 'var(--surface)', 
                        borderRadius: '12px', 
                        border: '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}>
                        <input
                          type="checkbox"
                          checked={requirements.contentType.includes(type.value)}
                          onChange={() => handleArrayToggle("contentType", type.value)}
                          style={{ 
                            width: '18px', 
                            height: '18px', 
                            accentColor: 'var(--primary)',
                            marginRight: '12px'
                          }}
                        />
                        <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: '500' }}>{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>


                <div>
                  <label htmlFor="brandGuidelines" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    Brand Guidelines
                  </label>
                  <textarea
                    id="brandGuidelines"
                    rows={3}
                    value={requirements.brandGuidelines}
                    onChange={(e) => handleRequirementsChange("brandGuidelines", e.target.value)}
                    className="textarea"
                    placeholder="Any specific brand guidelines or requirements..."
                  />
                </div>

                <div>
                  <label htmlFor="mustInclude" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    Must Include
                  </label>
                  <textarea
                    id="mustInclude"
                    rows={2}
                    value={requirements.mustInclude}
                    onChange={(e) => handleRequirementsChange("mustInclude", e.target.value)}
                    className="textarea"
                    placeholder="Elements that must be included..."
                  />
                </div>

                <div>
                  <label htmlFor="doNotUse" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    Do Not Use
                  </label>
                  <textarea
                    id="doNotUse"
                    rows={2}
                    value={requirements.doNotUse}
                    onChange={(e) => handleRequirementsChange("doNotUse", e.target.value)}
                    className="textarea"
                    placeholder="Elements to avoid or not use..."
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                    Reference Links
                  </label>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <input
                      type="url"
                      value={referenceUrl}
                      onChange={(e) => setReferenceUrl(e.target.value)}
                      className="input"
                      placeholder="Add reference URL..."
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={addReference}
                      className="btn-primary"
                      style={{ padding: '12px 20px' }}
                    >
                      Add
                    </button>
                  </div>
                  {requirements.references.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {requirements.references.map((ref, index) => (
                        <div key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          background: 'var(--surface)', 
                          padding: '12px 16px', 
                          borderRadius: '12px',
                          border: '1px solid var(--border)'
                        }}>
                          <a
                            href={ref.startsWith('http') ? ref : `https://${ref}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                              fontSize: '14px', 
                              color: 'var(--primary)', 
                              textDecoration: 'none',
                              flex: 1,
                              marginRight: '12px',
                              wordBreak: 'break-all'
                            }}
                          >
                            {ref}
                          </a>
                          <button
                            type="button"
                            onClick={() => removeReference(index)}
                            style={{ 
                              color: 'var(--error)', 
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  background: 'var(--primary-light-bg)', 
                  borderRadius: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 16px' 
                }}>
                  <Eye size={28} color="var(--primary)" />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
                  Review Your Task
                </h2>
                <p style={{ fontSize: '16px', color: 'var(--text-light)', margin: 0 }}>
                  Review all details before creating your task
                </p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>Task Details</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>
                      <strong>Title:</strong> {formData.title}
                    </p>
                    <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>
                      <strong>Type:</strong> Static Design
                    </p>
                    <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>
                      <strong>Priority:</strong> Medium
                    </p>
                    {formData.deadline && (
                      <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>
                        <strong>Deadline:</strong> {new Date(formData.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>Description</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>{formData.description}</p>
                </div>

                <div className="card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>Requirements</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>
                      <strong>Content Type:</strong> {requirements.contentType.join(", ") || "None specified"}
                    </p>
                    {requirements.brandGuidelines && (
                      <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>
                        <strong>Brand Guidelines:</strong> {requirements.brandGuidelines}
                      </p>
                    )}
                    {requirements.mustInclude && (
                      <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>
                        <strong>Must Include:</strong> {requirements.mustInclude}
                      </p>
                    )}
                    {requirements.doNotUse && (
                      <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>
                        <strong>Do Not Use:</strong> {requirements.doNotUse}
                      </p>
                    )}
                    {uploadedFiles.length > 0 && (
                      <div>
                        <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Uploaded Files:</strong>
                        <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'none' }}>
                          {uploadedFiles.map((file, index) => (
                            <li key={index} style={{ 
                              marginBottom: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              background: 'var(--surface)',
                              borderRadius: '8px',
                              border: '1px solid var(--border)'
                            }}>
                              <div style={{ color: 'var(--primary)' }}>
                                {getFileIcon(file)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ 
                                  fontSize: '14px', 
                                  fontWeight: '500',
                                  color: 'var(--text)',
                                  wordBreak: 'break-all'
                                }}>
                                  {file.name}
                                </div>
                                <div style={{ 
                                  fontSize: '12px', 
                                  color: 'var(--text-light)' 
                                }}>
                                  {formatFileSize(file.size)}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {requirements.references.length > 0 && (
                      <div>
                        <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Reference Links:</strong>
                        <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                          {requirements.references.map((ref, index) => (
                            <li key={index} style={{ marginBottom: '4px' }}>
                              <a 
                                href={ref.startsWith('http') ? ref : `https://${ref}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={{ 
                                  fontSize: '14px', 
                                  color: 'var(--primary)', 
                                  textDecoration: 'none' 
                                }}
                              >
                                {ref}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: currentStep === 1 ? 'flex-end' : 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="btn-outline btn-lg"
              >
                <ArrowLeft size={20} />
                Previous
              </button>
            )}
            
            {currentStep < 2 ? (
              <button
                type="button"
                onClick={nextStep}
                className="btn-primary btn-lg"
                style={{ color: 'white !important' }}
              >
                Next
                <ArrowRight size={20} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary btn-lg"
                style={{ 
                  background: 'var(--success)',
                  color: 'white',
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? (
                  <>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      border: '2px solid white', 
                      borderTop: '2px solid transparent', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite' 
                    }}></div>
                    Creating Task...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Create Task
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}