"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, User, LogOut, Settings, Layout, Palette, Shield, ChevronDown } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";

interface NavbarProps {
  variant?: 'home' | 'dashboard' | 'admin' | 'designer';
}

export default function Navbar({ variant = 'home' }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout } = useAuthContext();
  const { userRole, loading: roleLoading } = useRoleAccess();
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const getRoleBasedLinks = () => {
    if (!userRole) return [];
    
    const baseLinks = [
      { href: '/dashboard', label: 'Dashboard', icon: Layout }
    ];

    if (userRole.role === 'ADMIN') {
      return [
        { href: '/admin', label: 'Admin Panel', icon: Shield },
        { href: '/admin/tasks/new', label: 'Create Task', icon: Layout },
        { href: '/designer', label: 'Designer View', icon: Palette }
      ];
    } else if (userRole.role === 'DESIGNER') {
      return [
        ...baseLinks,
        { href: '/designer', label: 'Marketplace', icon: Palette }
      ];
    }
    
    return baseLinks;
  };

  const getRoleDisplayName = () => {
    if (!userRole) return 'User';
    return userRole.role === 'ADMIN' ? 'Admin' : 
           userRole.role === 'DESIGNER' ? 'Designer' : 'Client';
  };

  const getRoleColor = () => {
    if (!userRole) return '#6b7280';
    return userRole.role === 'ADMIN' ? '#ef4444' : 
           userRole.role === 'DESIGNER' ? '#8b5cf6' : '#3b82f6';
  };

  if (user && !roleLoading) {
    // Logged in user navbar
    return (
      <nav className="nav-container">
        <div className="nav-content">
          <div className="nav-brand">
            <Link href={userRole?.role === 'ADMIN' ? '/admin' : userRole?.role === 'DESIGNER' ? '/designer' : '/dashboard'} className="nav-brand-link">
              <div className="nav-logo">
                <Sparkles size={20} color="white" />
              </div>
              <span className="nav-brand-text">BlinkWorks</span>
            </Link>
          </div>
          
          {/* Desktop Navigation for logged in users */}
          <div className="nav-links-desktop">
            {getRoleBasedLinks().map((link) => {
              const IconComponent = link.icon;
              return (
                <Link key={link.href} href={link.href} className="nav-link">
                  <IconComponent size={16} />
                  {link.label}
                </Link>
              );
            })}
          </div>
          
          {/* Desktop User Menu */}
          <div className="nav-auth-desktop">
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <button
                onClick={toggleUserMenu}
                className="user-menu-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: getRoleColor(),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={16} color="white" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{getRoleDisplayName()}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>
                    {user.displayName || user.email?.split('@')[0] || 'User'}
                  </div>
                </div>
                <ChevronDown size={16} />
              </button>
              
              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb',
                  minWidth: '200px',
                  zIndex: 1000
                }}>
                  <div style={{ padding: '8px 0' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                        {user.displayName || 'User'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {user.email}
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: getRoleColor(), 
                        fontWeight: '600',
                        marginTop: '4px'
                      }}>
                        {getRoleDisplayName()}
                      </div>
                    </div>
                    
                    {getRoleBasedLinks().map((link) => {
                      const IconComponent = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="dropdown-link"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <IconComponent size={16} />
                          {link.label}
                        </Link>
                      );
                    })}
                    
                    <div style={{ borderTop: '1px solid #f3f4f6', margin: '8px 0' }}></div>
                    
                    <button
                      onClick={handleLogout}
                      className="dropdown-link"
                      style={{ color: '#ef4444' }}
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-btn" 
            aria-label="Toggle menu"
            onClick={toggleMobileMenu}
          >
            <div className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
        </div>
        
        {/* Mobile Navigation Menu for logged in users */}
        <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-content">
            {getRoleBasedLinks().map((link) => {
              const IconComponent = link.icon;
              return (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  className="mobile-nav-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <IconComponent size={16} />
                  {link.label}
                </Link>
              );
            })}
            
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', margin: '16px 0', paddingTop: '16px' }}>
              <div style={{ padding: '0 16px 8px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
                Signed in as {user.displayName || user.email?.split('@')[0] || 'User'}
              </div>
              <button
                onClick={handleLogout}
                className="mobile-nav-link"
                style={{ color: '#ef4444' }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Guest user navbar (original)
  return (
    <nav className="nav-container">
      <div className="nav-content">
        <div className="nav-brand">
          <div className="nav-logo">
            <Sparkles size={20} color="white" />
          </div>
          <span className="nav-brand-text">BlinkWorks</span>
        </div>
        
        {/* Desktop Navigation */}
        <div className="nav-links-desktop">
        </div>
        
        {/* Desktop Auth Buttons */}
        <div className="nav-auth-desktop">
          <Link href="/auth/signin" className="btn-ghost">Sign In</Link>
          <Link href="/auth/signup" className="btn-nav">
            Get Started
            <ArrowRight size={16} />
          </Link>
        </div>
        
        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn" 
          aria-label="Toggle menu"
          onClick={toggleMobileMenu}
        >
          <div className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>
      
      {/* Mobile Navigation Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          <div className="mobile-auth-buttons">
            <Link href="/auth/signin" className="btn-ghost mobile-btn">Sign In</Link>
            <Link href="/auth/signup" className="btn-nav mobile-btn">
              Get Started
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
