"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Upload, X, CheckCircle, Sparkles, FileText, Settings, Eye, File, Image, Video, Edit } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getTaskById, updateTask, CreativeRequirements } from "@/lib/firestore";

export default function EditTaskPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [task, setTask] = useState<any>(null);
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
      return;
    }

    const fetchTask = async () => {
      if (user && params.id) {
        setIsLoading(true);
        try {
          const fetchedTask = await getTaskById(params.id as string);
          if (fetchedTask) {
            setTask(fetchedTask);
            setFormData({
              title: fetchedTask.title,
              description: fetchedTask.description,
              deadline: fetchedTask.deadline ? new Date(fetchedTask.deadline).toISOString().split('T')[0] : "",
            });
            setRequirements(fetchedTask.requirements || {
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
          } else {
            setError("Task not found.");
          }
        } catch (err) {
          console.error("Error fetching task:", err);
          setError("Failed to load task details.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchTask();
  }, [user, authLoading, router, params.id]);

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
      if (!user || !task) {
        throw new Error("User not authenticated or task not found");
      }

      // Prepare uploaded files data
      const uploadedFilesData = uploadedFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type
      }));

      // Create task data, filtering out undefined values
      const taskData: any = {
        title: formData.title,
        description: formData.description,
        requirements: {
          ...requirements
        },
      };

      // Only add uploadedFiles if there are files
      if (uploadedFilesData.length > 0) {
        taskData.requirements.uploadedFiles = uploadedFilesData;
      }

      // Only add deadline if it exists
      if (formData.deadline) {
        taskData.deadline = new Date(formData.deadline);
      }

      // Update task
      await updateTask(task.id, taskData);

      router.push(`/dashboard/tasks/${task.id}`);
    } catch (error: any) {
      console.error("Task update error:", error);
      setError(error.message || "An error occurred while updating the task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
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

  if (error || !task) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            background: 'var(--error-light-bg)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 16px' 
          }}>
            <X size={24} color="var(--error)" />
          </div>
          <p style={{ fontSize: '18px', color: 'var(--error)', margin: 0 }}>{error || 'Task not found'}</p>
          <Link href="/dashboard" className="btn-primary" style={{ marginTop: '24px' }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
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
            <Link href={`/dashboard/tasks/${task.id}`} className="btn-ghost">
              <ArrowLeft size={16} />
              Back to Task
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
            <Edit size={36} color="white" />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '12px' }}>
            Edit Task
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-light)', margin: 0 }}>
            Update your task details and requirements
          </p>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
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

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
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
                  Updating Task...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Update Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
