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
  X
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getTaskById, updateTask, Task, pushTaskToMarketplace, getUserById, User as FirestoreUser, reviewDesignerDelivery } from "@/lib/firestore";
import { RoleGuard } from "@/components/RoleGuard";

export default function AdminTaskReview() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const params = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [assignedDesigner, setAssignedDesigner] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [clientInfo, setClientInfo] = useState<FirestoreUser | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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
            setAdminNotes(fetchedTask.adminNotes || "");
            setAssignedDesigner(fetchedTask.assignedDesigner || "");
            setNewStatus(fetchedTask.status);
            
            // Fetch client information
            try {
              const client = await getUserById(fetchedTask.userId);
              setClientInfo(client);
            } catch (err) {
              console.error("Error fetching client info:", err);
            }
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

  const handleStatusUpdate = async () => {
    if (!task) return;
    
    setIsUpdating(true);
    try {
      await updateTask(task.id, {
        status: newStatus,
        adminNotes: adminNotes,
        assignedDesigner: assignedDesigner,
        reviewedAt: new Date()
      });
      
      // Update local state
      setTask(prev => prev ? {
        ...prev,
        status: newStatus as Task['status'],
        adminNotes: adminNotes,
        assignedDesigner: assignedDesigner
      } : null);
      
      alert("Task updated successfully!");
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePushToMarketplace = async () => {
    if (!task || isPushing) return;
    setIsPushing(true);
    try {
      await pushTaskToMarketplace(task.id);
      setTask(prev => prev ? { 
        ...prev, 
        pushedToMarketplace: true, 
        pushedAt: new Date(),
        status: 'IN_REVIEW'
      } : null);
      alert("Task pushed to designer marketplace successfully!");
    } catch (err) {
      console.error("Error pushing task to marketplace:", err);
      setError("Failed to push task to marketplace.");
    } finally {
      setIsPushing(false);
    }
  };

  const handleReviewDelivery = async (status: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED') => {
    if (!task || !user) return;
    
    setIsSubmittingReview(true);
    try {
      await reviewDesignerDelivery(task.id, status, reviewFeedback, user.uid, false);
      
      // Refresh task data
      const updatedTask = await getTaskById(task.id);
      if (updatedTask) {
        setTask(updatedTask);
      }
      
      setReviewFeedback("");
      alert(`Delivery ${status.toLowerCase()} successfully!`);
    } catch (err) {
      console.error("Error reviewing delivery:", err);
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle size={16} color="var(--success)" />;
      case 'designing':
        return <Clock size={16} color="var(--warning)" />;
      case 'under_review':
        return <AlertCircle size={16} color="var(--accent-color)" />;
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
      case 'designing':
        return 'var(--warning)';
      case 'under_review':
        return 'var(--accent-color)';
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
          <p style={{ fontSize: '18px', color: 'var(--text)', margin: 0 }}>Loading task details...</p>
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
          <p style={{ fontSize: '18px', color: 'var(--error)', margin: 0 }}>{error || 'Task not found'}</p>
          <Link href="/admin" className="btn-primary" style={{ marginTop: '24px' }}>
            Back to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard requiredRole="ADMIN">
      <div className="min-h-screen gradient-bg">
      {/* Navigation */}
      <nav className="nav-container">
        <div className="nav-content">
          <div className="nav-brand">
            <div className="nav-logo">
              <Sparkles size={20} color="white" />
            </div>
            <span className="nav-brand-text">BlinkWorks Admin</span>
          </div>
          <div className="nav-auth-desktop">
            <Link href="/admin" className="btn-ghost">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
        {/* Task Header */}
        <div className="card" style={{ marginBottom: '32px', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
                {task.title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <User size={16} color="var(--text-light)" />
                <span style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: '500' }}>
                  Client: {clientInfo?.name || 'Loading...'}
                </span>
                {clientInfo?.email && (
                  <span style={{ fontSize: '12px', color: 'var(--text-light)', opacity: 0.7 }}>
                    ({clientInfo.email})
                  </span>
                )}
              </div>
              <p style={{ fontSize: '16px', color: 'var(--text-light)', margin: 0 }}>
                {task.description}
              </p>
            </div>
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 4px 0' }}><strong>Type</strong></p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text)', margin: 0 }}>{formatTaskType(task.type)}</p>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 4px 0' }}><strong>Priority</strong></p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text)', margin: 0 }}>{task.priority}</p>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 4px 0' }}><strong>Created</strong></p>
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
          {/* Task Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Requirements */}
            <div className="card" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px' }}>
                Creative Requirements
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
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Admin Actions Sidebar */}
          <div className="card" style={{ padding: '32px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px' }}>
              Admin Actions
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
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="DESIGNING">Designing</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              {/* Designer Assignment */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                  Assign Designer
                </label>
                <input
                  type="text"
                  value={assignedDesigner}
                  onChange={(e) => setAssignedDesigner(e.target.value)}
                  placeholder="Designer name or ID"
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

              {/* Admin Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add context or notes for the designer..."
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
                      Update Task
                    </>
                  )}
                </button>

                {!task.pushedToMarketplace && (
                  <button
                    onClick={handlePushToMarketplace}
                    disabled={isPushing}
                    className="btn-outline"
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      fontSize: '14px',
                      opacity: isPushing ? 0.7 : 1,
                      cursor: isPushing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isPushing ? (
                      <>
                        <div style={{ 
                          width: '16px', 
                          height: '16px', 
                          border: '2px solid var(--primary)', 
                          borderTop: '2px solid transparent', 
                          borderRadius: '50%', 
                          animation: 'spin 1s linear infinite' 
                        }}></div>
                        Pushing...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Push to Marketplace
                      </>
                    )}
                  </button>
                )}

                {task.pushedToMarketplace && (
                  <div style={{
                    padding: '12px',
                    background: 'var(--success-light-bg)',
                    color: 'var(--success)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textAlign: 'center'
                  }}>
                    <CheckCircle size={16} />
                    Pushed to Marketplace
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Designer Deliverables Section */}
          {task.designerDeliveries && (task.designerDeliveries.files.length > 0 || task.designerDeliveries.links.length > 0) && (
            <div className="card" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px' }}>
                Designer Deliverables
              </h2>
              
              {/* Deliverable Status */}
              {task.designerDeliveries.status && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    background: task.designerDeliveries.status === 'APPROVED' ? 'var(--success-light-bg)' : 
                               task.designerDeliveries.status === 'REJECTED' ? 'var(--error-light-bg)' :
                               task.designerDeliveries.status === 'REVISION_REQUESTED' ? 'var(--warning-light-bg)' : 'var(--surface)',
                    color: task.designerDeliveries.status === 'APPROVED' ? 'var(--success)' :
                           task.designerDeliveries.status === 'REJECTED' ? 'var(--error)' :
                           task.designerDeliveries.status === 'REVISION_REQUESTED' ? 'var(--warning)' : 'var(--text)',
                    border: `1px solid ${task.designerDeliveries.status === 'APPROVED' ? 'var(--success)' : 
                             task.designerDeliveries.status === 'REJECTED' ? 'var(--error)' :
                             task.designerDeliveries.status === 'REVISION_REQUESTED' ? 'var(--warning)' : 'var(--border)'}`
                  }}>
                    {task.designerDeliveries.status === 'APPROVED' && <CheckCircle size={16} />}
                    {task.designerDeliveries.status === 'REJECTED' && <X size={16} />}
                    {task.designerDeliveries.status === 'REVISION_REQUESTED' && <AlertCircle size={16} />}
                    {task.designerDeliveries.status === 'SUBMITTED' && <Clock size={16} />}
                    {task.designerDeliveries.status.replace('_', ' ')}
                  </div>
                </div>
              )}

              {/* Designer Notes */}
              {task.designerDeliveries.notes && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    Designer Notes
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-light)', lineHeight: '1.5' }}>
                    {task.designerDeliveries.notes}
                  </p>
                </div>
              )}

              {/* Files */}
              {task.designerDeliveries.files.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                    Files
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {task.designerDeliveries.files.map((file, index) => (
                      <div key={index} style={{
                        padding: '12px',
                        background: 'var(--surface)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        textAlign: 'center'
                      }}>
                        <File size={24} color="var(--text-light)" style={{ marginBottom: '8px' }} />
                        <p style={{ fontSize: '12px', color: 'var(--text)', margin: '0 0 8px 0', wordBreak: 'break-word' }}>
                          {file.name}
                        </p>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '12px',
                            color: 'var(--primary)',
                            textDecoration: 'none'
                          }}
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {task.designerDeliveries.links.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                    Links
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {task.designerDeliveries.links.map((link, index) => (
                      <div key={index} style={{
                        padding: '12px',
                        background: 'var(--surface)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)'
                      }}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '14px',
                            color: 'var(--primary)',
                            textDecoration: 'none',
                            display: 'block'
                          }}
                        >
                          {link.name}
                        </a>
                        {link.description && (
                          <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '4px 0 0 0' }}>
                            {link.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Section - Only show if not already approved */}
              {task.designerDeliveries.status !== 'APPROVED' && (
                <div style={{ marginTop: '24px', padding: '20px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
                    Review Deliverables (Admin)
                  </h3>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                      Admin Feedback (Optional)
                    </label>
                    <textarea
                      value={reviewFeedback}
                      onChange={(e) => setReviewFeedback(e.target.value)}
                      placeholder="Provide admin feedback on the deliverables..."
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleReviewDelivery('APPROVED')}
                      disabled={isSubmittingReview}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--success)',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: isSubmittingReview ? 'not-allowed' : 'pointer',
                        opacity: isSubmittingReview ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <CheckCircle size={16} />
                      Approve
                    </button>
                    
                    <button
                      onClick={() => handleReviewDelivery('REVISION_REQUESTED')}
                      disabled={isSubmittingReview}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--warning)',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: isSubmittingReview ? 'not-allowed' : 'pointer',
                        opacity: isSubmittingReview ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <AlertCircle size={16} />
                      Request Revision
                    </button>
                    
                    <button
                      onClick={() => handleReviewDelivery('REJECTED')}
                      disabled={isSubmittingReview}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--error)',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: isSubmittingReview ? 'not-allowed' : 'pointer',
                        opacity: isSubmittingReview ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <X size={16} />
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Show existing feedback */}
              {(task.designerDeliveries.clientFeedback || task.designerDeliveries.adminFeedback) && (
                <div style={{ marginTop: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                    Feedback
                  </h3>
                  {task.designerDeliveries.clientFeedback && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-light)', marginBottom: '4px' }}>
                        Client Feedback:
                      </p>
                      <p style={{ fontSize: '14px', color: 'var(--text)', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                        {task.designerDeliveries.clientFeedback}
                      </p>
                    </div>
                  )}
                  {task.designerDeliveries.adminFeedback && (
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-light)', marginBottom: '4px' }}>
                        Admin Feedback:
                      </p>
                      <p style={{ fontSize: '14px', color: 'var(--text)', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                        {task.designerDeliveries.adminFeedback}
                      </p>
                    </div>
                  )}
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
