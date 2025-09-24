"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, Image, File, Video, Palette, Sparkles, Search, Filter } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getTasksByUserId, Task } from "@/lib/firestore";
import Navbar from "@/components/Navbar";
import { RoleGuard } from "@/components/RoleGuard";

export default function MyCreativesPage() {
  const { user, userProfile, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (user) {
        setLoading(true);
        try {
          const userTasks = await getTasksByUserId(user.uid);
          setTasks(userTasks);
        } catch (error) {
          console.error("Error fetching tasks:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTasks();
  }, [user]);

  const formatTaskType = (type: string) => {
    switch (type) {
      case 'STATIC_DESIGN': return 'Static Design';
      case 'VIDEO_PRODUCTION': return 'Video Production';
      case 'ANIMATION': return 'Animation';
      case 'ILLUSTRATION': return 'Illustration';
      case 'BRANDING': return 'Branding';
      case 'WEB_DESIGN': return 'Web Design';
      case 'OTHER': return 'Other';
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    
    try {
      if (date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString();
      }
      
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'N/A';
      }
      
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'N/A';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'STATIC_DESIGN': return <Image size={16} />;
      case 'VIDEO_PRODUCTION': return <Video size={16} />;
      case 'ANIMATION': return <Sparkles size={16} />;
      case 'ILLUSTRATION': return <Palette size={16} />;
      case 'BRANDING': return <Palette size={16} />;
      case 'WEB_DESIGN': return <File size={16} />;
      default: return <File size={16} />;
    }
  };

  const completedTasks = tasks.filter(task => 
    task.status.toLowerCase() === 'completed' && 
    task.designerDeliveries && 
    (task.designerDeliveries.files?.length > 0 || task.designerDeliveries.links?.length > 0)
  );

  const filteredTasks = completedTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "ALL" || task.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const taskTypes = Array.from(new Set(completedTasks.map(task => task.type)));

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navbar />
        <div className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              background: 'var(--primary-light-bg)', 
              borderRadius: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px',
              animation: 'pulse 2s infinite'
            }}>
              <Sparkles size={28} color="var(--primary)" />
            </div>
            <p style={{ fontSize: '18px', color: 'var(--text-light)', margin: 0 }}>Loading your creatives...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard requiredRoles={['CLIENT']}>
      <div className="min-h-screen gradient-bg">
        <Navbar />
        <div className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <Link 
                href="/dashboard" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  color: 'var(--text-light)', 
                  textDecoration: 'none',
                  fontSize: '14px',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-light)'}
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </Link>
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text)', margin: 0, marginBottom: '8px' }}>
              My Creatives
            </h1>
            <p style={{ fontSize: '18px', color: 'var(--text-light)', margin: 0 }}>
              Your completed and approved creative work
            </p>
          </div>

          {/* Search and Filter */}
          <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  type="text"
                  placeholder="Search creatives..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={16} color="var(--text-light)" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL">All Types</option>
                  {taskTypes.map(type => (
                    <option key={type} value={type}>{formatTaskType(type)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: 0 }}>
              Showing {filteredTasks.length} of {completedTasks.length} creatives
            </p>
          </div>

          {/* Creatives Grid */}
          {filteredTasks.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <div style={{ 
                width: '72px', 
                height: '72px', 
                background: 'var(--surface)', 
                borderRadius: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 24px' 
              }}>
                <Sparkles size={36} color="var(--text-light)" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                {searchTerm || filterType !== "ALL" ? 'No creatives found' : 'No completed designs yet'}
              </h3>
              <p style={{ color: 'var(--text-light)', margin: 0, fontSize: '16px' }}>
                {searchTerm || filterType !== "ALL" 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Your approved designs will appear here once tasks are completed'
                }
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
              {filteredTasks.map((task) => (
                <div key={task.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', margin: 0, flex: 1 }}>
                      {task.title}
                    </h3>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      background: 'var(--success-light-bg)', 
                      color: 'var(--success)',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      <Sparkles size={12} />
                      Completed
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      background: 'var(--primary-light-bg)', 
                      color: 'var(--primary)',
                      fontSize: '12px',
                      fontWeight: '500',
                      marginBottom: '8px'
                    }}>
                      {getTypeIcon(task.type)}
                      {formatTaskType(task.type)}
                    </div>
                  </div>

                  {/* Deliverables */}
                  <div style={{ marginBottom: '16px' }}>
                    {task.designerDeliveries?.files && task.designerDeliveries.files.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                          Files ({task.designerDeliveries.files.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {task.designerDeliveries.files.map((file, index) => (
                            <div key={index} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              background: 'var(--surface)',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              fontSize: '12px'
                            }}>
                              <File size={12} color="var(--text-light)" />
                              <span style={{ color: 'var(--text)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {file.name}
                              </span>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--primary)', textDecoration: 'none' }}
                              >
                                <Download size={12} />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {task.designerDeliveries?.links && task.designerDeliveries.links.length > 0 && (
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                          Links ({task.designerDeliveries.links.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {task.designerDeliveries.links.map((link, index) => (
                            <a
                              key={index}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 12px',
                                background: 'var(--surface)',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                textDecoration: 'none',
                                color: 'var(--text)',
                                fontSize: '12px',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--primary-light-bg)';
                                e.currentTarget.style.borderColor = 'var(--primary)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--surface)';
                                e.currentTarget.style.borderColor = 'var(--border)';
                              }}
                            >
                              <ExternalLink size={12} color="var(--primary)" />
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {link.description || link.url}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                      Completed {formatDate(task.reviewedAt || task.updatedAt)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Delivery Link */}
                      {task.designerDeliveries?.links && task.designerDeliveries.links.length > 0 && (
                        <a
                          href={(() => {
                            const url = task.designerDeliveries.links[0].url;
                            if (!url) return '#';
                            if (url.startsWith('http://') || url.startsWith('https://')) {
                              return url;
                            }
                            return `https://${url}`;
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            fontSize: '12px', 
                            color: 'var(--primary)', 
                            textDecoration: 'none',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'var(--background)',
                            border: '1px solid var(--border)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--primary-light-bg)';
                            e.currentTarget.style.borderColor = 'var(--primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--background)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        >
                          <ExternalLink size={12} />
                          Link
                        </a>
                      )}
                      
                      {/* View Details Link */}
                      <Link 
                        href={`/dashboard/tasks/${task.id}`} 
                        style={{ 
                          fontSize: '12px', 
                          color: 'var(--primary)', 
                          textDecoration: 'none',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
