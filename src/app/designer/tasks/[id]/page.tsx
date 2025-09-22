"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  File, 
  Image, 
  Video, 
  Sparkles,
  Save,
  Send,
  User,
  Calendar,
  MessageSquare,
  Edit,
  Briefcase,
  Download,
  ExternalLink,
  Upload,
  Link as LinkIcon,
  X,
  Plus
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getTaskById, updateTask, Task, claimTask, addDesignerDelivery, removeDesignerDelivery, updateDesignerDeliveryNotes, DesignerDelivery } from "@/lib/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { RoleGuard } from "@/components/RoleGuard";

export default function DesignerTaskDetail() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const params = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [designerNotes, setDesignerNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  
  // Delivery state
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newLinkDescription, setNewLinkDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
      return;
    }

    const fetchTask = async () => {
      if (user && params.id) {
        setLoading(true);
        try {
          const fetchedTask = await getTaskById(params.id as string);
          if (fetchedTask) {
            setTask(fetchedTask);
            setDesignerNotes(fetchedTask.designerNotes || "");
            setNewStatus(fetchedTask.status);
          } else {
            setError("Task not found.");
          }
        } catch (err) {
          console.error("Error fetching task:", err);
          setError("Failed to load task details.");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTask();
  }, [user, authLoading, router, params.id]);

  const handleClaimTask = async () => {
    if (!task || !user) return;
    
    setIsClaiming(true);
    try {
      await claimTask(task.id, user.uid);
      setTask(prev => prev ? {
        ...prev,
        status: 'IN_PROGRESS',
        assignedDesigner: user.uid
      } : null);
      alert("Task claimed successfully! You can now start working on it.");
    } catch (error) {
      console.error("Error claiming task:", error);
      alert("Failed to claim task. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!task) return;
    
    setIsUpdating(true);
    try {
      await updateTask(task.id, {
        status: newStatus,
        designerNotes: designerNotes,
        updatedAt: new Date()
      });
      
      setTask(prev => prev ? {
        ...prev,
        status: newStatus as Task['status'],
        designerNotes: designerNotes
      } : null);
      
      alert("Task updated successfully!");
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Delivery functions
  const handleFileUpload = async (files: FileList) => {
    if (!task || !user) return;
    
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Upload to Firebase Storage
        const storageRef = ref(storage, `deliveries/${task.id}/${Date.now()}-${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        // Add to deliveries
        await addDesignerDelivery(task.id, {
          type: 'FILE',
          name: file.name,
          url: downloadURL,
          description: ''
        }, user.uid);
      }
      
      // Refresh task data
      const updatedTask = await getTaskById(task.id);
      if (updatedTask) {
        setTask(updatedTask);
      }
      
      alert("Files uploaded successfully!");
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to upload files. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!task || !user || !newLink.trim()) return;
    
    try {
      await addDesignerDelivery(task.id, {
        type: 'LINK',
        name: newLinkDescription || newLink,
        url: newLink,
        description: newLinkDescription
      }, user.uid);
      
      setNewLink("");
      setNewLinkDescription("");
      
      // Refresh task data
      const updatedTask = await getTaskById(task.id);
      if (updatedTask) {
        setTask(updatedTask);
      }
      
      alert("Link added successfully!");
    } catch (error) {
      console.error("Error adding link:", error);
      alert("Failed to add link. Please try again.");
    }
  };

  const handleRemoveDelivery = async (deliveryId: string, type: 'FILE' | 'LINK') => {
    if (!task) return;
    
    try {
      await removeDesignerDelivery(task.id, deliveryId, type);
      
      // Refresh task data
      const updatedTask = await getTaskById(task.id);
      if (updatedTask) {
        setTask(updatedTask);
      }
      
      alert("Delivery removed successfully!");
    } catch (error) {
      console.error("Error removing delivery:", error);
      alert("Failed to remove delivery. Please try again.");
    }
  };

  const handleSubmitDelivery = async () => {
    if (!task || !user) return;
    
    setIsSubmittingDelivery(true);
    try {
      await updateDesignerDeliveryNotes(task.id, deliveryNotes);
      
      // Update task status to ready for review
      await updateTask(task.id, {
        status: 'READY_FOR_REVIEW',
        updatedAt: new Date()
      });
      
      setTask(prev => prev ? {
        ...prev,
        status: 'READY_FOR_REVIEW',
        designerDeliveries: {
          files: prev.designerDeliveries?.files || [],
          links: prev.designerDeliveries?.links || [],
          notes: deliveryNotes,
          submittedAt: new Date()
        }
      } : null);
      
      alert("Delivery submitted successfully! The client will be notified for review.");
    } catch (error) {
      console.error("Error submitting delivery:", error);
      alert("Failed to submit delivery. Please try again.");
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle size={16} color="var(--success)" />;
      case 'in_progress':
        return <Clock size={16} color="var(--warning)" />;
      case 'ready_for_review':
        return <AlertCircle size={16} color="var(--accent-color)" />;
      case 'in_review':
        return <AlertCircle size={16} color="var(--primary)" />;
      case 'submitted':
        return <AlertCircle size={16} color="var(--primary)" />;
      default:
        return <Clock size={16} color="var(--text-light)" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'var(--success)';
      case 'in_progress':
        return 'var(--warning)';
      case 'ready_for_review':
        return 'var(--accent-color)';
      case 'in_review':
        return 'var(--primary)';
      case 'submitted':
        return 'var(--primary)';
      default:
        return 'var(--text-light)';
    }
  };

  const formatTaskType = (type: string) => {
    switch (type) {
      case 'STATIC_DESIGN':
        return 'Static Design';
      case 'VIDEO_PRODUCTION':
        return 'Video Production';
      case 'ANIMATION':
        return 'Animation';
      case 'ILLUSTRATION':
        return 'Illustration';
      case 'BRANDING':
        return 'Branding';
      case 'WEB_DESIGN':
        return 'Web Design';
      case 'OTHER':
        return 'Other';
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading || loading) {
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
          <p style={{ fontSize: '18px', color: 'var(--text)', margin: 0 }}>Loading project details...</p>
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
            <AlertCircle size={24} color="var(--error)" />
          </div>
          <p style={{ fontSize: '18px', color: 'var(--error)', margin: 0 }}>{error || 'Project not found'}</p>
          <Link href="/designer" className="btn-primary" style={{ marginTop: '24px' }}>
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const isMyTask = task.assignedDesigner === user.uid;
  const canClaim = task.pushedToMarketplace === true && !task.assignedDesigner;

  return (
    <RoleGuard requiredRoles={["DESIGNER", "ADMIN"]} fallbackPath="/admin">
      <div className="min-h-screen gradient-bg">
      {/* Navigation */}
      <nav className="nav-container">
        <div className="nav-content">
          <div className="nav-brand">
            <div className="nav-logo">
              <Sparkles size={20} color="white" />
            </div>
            <span className="nav-brand-text">Designer Marketplace</span>
          </div>
          <div className="nav-auth-desktop">
            <Link href="/designer" className="btn-ghost">
              <ArrowLeft size={16} />
              Back to Marketplace
            </Link>
          </div>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
        {/* Project Header */}
        <div className="card" style={{ marginBottom: '32px', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
                {task.title}
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--text-light)', margin: 0 }}>
                {task.description}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 16px', 
                borderRadius: '12px', 
                background: 'var(--surface)',
                fontSize: '14px',
                fontWeight: '600',
                color: getStatusColor(task.status)
              }}>
                {getStatusIcon(task.status)}
                {task.status.replace('_', ' ')}
              </div>
              
              {canClaim && (
                <button
                  onClick={handleClaimTask}
                  disabled={isClaiming}
                  className="btn-primary"
                  style={{ 
                    padding: '10px 20px',
                    opacity: isClaiming ? 0.7 : 1,
                    cursor: isClaiming ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isClaiming ? (
                    <>
                      <div style={{ 
                        width: '16px', 
                        height: '16px', 
                        border: '2px solid white', 
                        borderTop: '2px solid transparent', 
                        borderRadius: '50%', 
                        animation: 'spin 1s linear infinite' 
                      }}></div>
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Briefcase size={16} />
                      Claim Project
                    </>
                  )}
                </button>
              )}
              
              {isMyTask && (
                <div style={{
                  padding: '10px 20px',
                  background: 'var(--warning-light-bg)',
                  color: 'var(--warning)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <CheckCircle size={16} />
                  My Project
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 4px 0' }}><strong>Project Type</strong></p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text)', margin: 0 }}>{formatTaskType(task.type)}</p>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 4px 0' }}><strong>Priority</strong></p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text)', margin: 0 }}>{task.priority}</p>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 4px 0' }}><strong>Posted</strong></p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text)', margin: 0 }}>{formatDate(task.createdAt)}</p>
            </div>
            {task.deadline && (
              <div>
                <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 4px 0' }}><strong>Deadline</strong></p>
                <p style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text)', margin: 0 }}>{formatDate(task.deadline)}</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }}>
          {/* Project Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Requirements */}
            <div className="card" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px' }}>
                Project Requirements
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {task.requirements.contentType.length > 0 && (
                  <div>
                    <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 8px 0' }}><strong>Content Type</strong></p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {task.requirements.contentType.map((type, index) => (
                        <span key={index} style={{ 
                          background: 'var(--primary-light-bg)', 
                          color: 'var(--primary)', 
                          padding: '6px 12px', 
                          borderRadius: '16px', 
                          fontSize: '13px', 
                          fontWeight: '500' 
                        }}>
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {task.requirements.brandGuidelines && (
                  <div>
                    <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 8px 0' }}><strong>Brand Guidelines</strong></p>
                    <p style={{ fontSize: '16px', color: 'var(--text)', lineHeight: '1.6' }}>{task.requirements.brandGuidelines}</p>
                  </div>
                )}

                {task.requirements.mustInclude && (
                  <div>
                    <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 8px 0' }}><strong>Must Include</strong></p>
                    <p style={{ fontSize: '16px', color: 'var(--text)', lineHeight: '1.6' }}>{task.requirements.mustInclude}</p>
                  </div>
                )}

                {task.requirements.doNotUse && (
                  <div>
                    <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 8px 0' }}><strong>Do Not Use</strong></p>
                    <p style={{ fontSize: '16px', color: 'var(--text)', lineHeight: '1.6' }}>{task.requirements.doNotUse}</p>
                  </div>
                )}

                {/* Admin Notes */}
                {task.adminNotes && (
                  <div style={{
                    background: 'var(--accent-light-bg)',
                    border: '1px solid var(--accent-color)',
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <p style={{ fontSize: '14px', color: 'var(--accent-color)', margin: '0 0 8px 0', fontWeight: '600' }}>
                      <MessageSquare size={16} style={{ marginRight: '6px', display: 'inline' }} />
                      Admin Notes
                    </p>
                    <p style={{ fontSize: '16px', color: 'var(--text)', lineHeight: '1.6', margin: 0 }}>{task.adminNotes}</p>
                  </div>
                )}

                {/* Reference Files */}
                {task.requirements.uploadedFiles && task.requirements.uploadedFiles.length > 0 && (
                  <div>
                    <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 8px 0' }}><strong>Reference Files</strong></p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {task.requirements.uploadedFiles.map((file, index) => (
                        <div key={index} style={{
                          padding: '12px',
                          background: 'var(--surface)',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px'
                        }}>
                          <div style={{ color: 'var(--primary)', marginTop: '2px' }}>
                            {file.type.startsWith('image/') ? <Image size={20} /> : 
                             file.type.startsWith('video/') ? <Video size={20} /> : 
                             <File size={20} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <a
                              href={file.downloadURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '14px',
                                fontWeight: '500',
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                display: 'block',
                                marginBottom: '8px'
                              }}
                            >
                              {file.name}
                              <ExternalLink size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                            </a>
                            <div style={{
                              fontSize: '12px',
                              color: 'var(--text-light)',
                              marginBottom: '8px'
                            }}>
                              {Math.round(file.size / 1024)} KB • {file.type}
                            </div>
                            
                            {/* Image Preview */}
                            {file.type.startsWith('image/') && (
                              <div style={{
                                marginTop: '8px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                maxWidth: '300px'
                              }}>
                                <img
                                  src={file.downloadURL}
                                  alt={file.name}
                                  style={{
                                    width: '100%',
                                    height: 'auto',
                                    maxHeight: '200px',
                                    objectFit: 'cover',
                                    display: 'block',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => window.open(file.downloadURL, '_blank')}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reference Links */}
                {task.requirements.references && task.requirements.references.length > 0 && (
                  <div>
                    <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 8px 0' }}><strong>Reference Links</strong></p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {task.requirements.references.map((ref, index) => (
                        <div key={index} style={{
                          padding: '12px',
                          background: 'var(--surface)',
                          borderRadius: '8px',
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
                              display: 'block'
                            }}
                          >
                            {ref}
                            <ExternalLink size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Designer Actions Sidebar */}
          {isMyTask && (
            <div className="card" style={{ padding: '32px', height: 'fit-content' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px' }}>
                My Project Actions
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Status Update */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    Update Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
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
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="READY_FOR_REVIEW">Ready for Review</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                {/* Designer Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    My Notes
                  </label>
                  <textarea
                    value={designerNotes}
                    onChange={(e) => setDesignerNotes(e.target.value)}
                    placeholder="Add notes about your progress or questions..."
                    rows={6}
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

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={isUpdating}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '14px',
                      opacity: isUpdating ? 0.7 : 1,
                      cursor: isUpdating ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isUpdating ? (
                      <>
                        <div style={{ 
                          width: '16px', 
                          height: '16px', 
                          border: '2px solid white', 
                          borderTop: '2px solid transparent', 
                          borderRadius: '50%', 
                          animation: 'spin 1s linear infinite' 
                        }}></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Update Project
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Designer Delivery Section */}
          {isMyTask && (
            <div className="card" style={{ marginTop: '32px', padding: '32px' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px' }}>
                Deliver Your Work
              </h3>
              <p style={{ fontSize: '16px', color: 'var(--text-light)', marginBottom: '32px' }}>
                Upload your completed designs, videos, or other deliverables for client review.
              </p>

              {/* File Upload Section */}
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
                  Upload Files
                </h4>
                <div
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: '12px',
                    padding: '32px',
                    textAlign: 'center',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'var(--primary-light-bg)';
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--surface)';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--surface)';
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      handleFileUpload(files);
                    }
                  }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = 'image/*,video/*,.pdf,.psd,.ai,.sketch,.figma';
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files.length > 0) {
                        handleFileUpload(files);
                      }
                    };
                    input.click();
                  }}
                >
                  <Upload size={48} color="var(--text-light)" style={{ marginBottom: '16px' }} />
                  <p style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '8px' }}>
                    Drop files here or click to upload
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: 0 }}>
                    Supports images, videos, PDFs, and design files
                  </p>
                  {isUploading && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ 
                        width: '24px', 
                        height: '24px', 
                        border: '2px solid var(--primary)', 
                        borderTop: '2px solid transparent', 
                        borderRadius: '50%', 
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto'
                      }}></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Link Submission Section */}
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
                  Add Links
                </h4>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <input
                    type="url"
                    placeholder="https://example.com/your-work"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={handleAddLink}
                    disabled={!newLink.trim()}
                    className="btn-primary"
                    style={{
                      padding: '12px 20px',
                      opacity: !newLink.trim() ? 0.5 : 1,
                      cursor: !newLink.trim() ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Plus size={16} />
                    Add Link
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Optional description..."
                  value={newLinkDescription}
                  onChange={(e) => setNewLinkDescription(e.target.value)}
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

              {/* Current Deliveries */}
              {task.designerDeliveries && (
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
                    Current Deliveries
                  </h4>
                  
                  {/* Files */}
                  {task.designerDeliveries.files && task.designerDeliveries.files.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '12px' }}>
                        Files ({task.designerDeliveries.files.length})
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {task.designerDeliveries.files.map((file) => (
                          <div key={file.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px',
                            background: 'var(--surface)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <File size={20} color="var(--primary)" />
                              <div>
                                <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)', margin: 0 }}>
                                  {file.name}
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: 0 }}>
                                  {new Date(file.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-ghost"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                <Download size={14} />
                                Download
                              </a>
                              <button
                                onClick={() => handleRemoveDelivery(file.id, 'FILE')}
                                className="btn-ghost"
                                style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--error)' }}
                              >
                                <X size={14} />
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  {task.designerDeliveries.links && task.designerDeliveries.links.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '12px' }}>
                        Links ({task.designerDeliveries.links.length})
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {task.designerDeliveries.links.map((link) => (
                          <div key={link.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px',
                            background: 'var(--surface)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <LinkIcon size={20} color="var(--primary)" />
                              <div>
                                <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)', margin: 0 }}>
                                  {link.name}
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: 0 }}>
                                  {link.url}
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-ghost"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                <ExternalLink size={14} />
                                Open
                              </a>
                              <button
                                onClick={() => handleRemoveDelivery(link.id, 'LINK')}
                                className="btn-ghost"
                                style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--error)' }}
                              >
                                <X size={14} />
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivery Notes */}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                      Delivery Notes
                    </label>
                    <textarea
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Add any notes about your delivery, instructions for the client, or additional context..."
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

                  {/* Submit Delivery Button */}
                  <button
                    onClick={handleSubmitDelivery}
                    disabled={isSubmittingDelivery || (!task.designerDeliveries?.files?.length && !task.designerDeliveries?.links?.length)}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '600',
                      opacity: (isSubmittingDelivery || (!task.designerDeliveries?.files?.length && !task.designerDeliveries?.links?.length)) ? 0.5 : 1,
                      cursor: (isSubmittingDelivery || (!task.designerDeliveries?.files?.length && !task.designerDeliveries?.links?.length)) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isSubmittingDelivery ? (
                      <>
                        <div style={{ 
                          width: '20px', 
                          height: '20px', 
                          border: '2px solid white', 
                          borderTop: '2px solid transparent', 
                          borderRadius: '50%', 
                          animation: 'spin 1s linear infinite' 
                        }}></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        Submit for Review
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </RoleGuard>
  );
}
