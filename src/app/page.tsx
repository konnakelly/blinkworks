"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle, Sparkles, Users, Zap, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen gradient-bg">
      {/* Navigation */}
      <Navbar variant="home" />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={16} color="#3b82f6" />
              The future of creative collaboration
            </div>
            <h1 className="hero-title">
              Creative Briefs That{" "}
              <span className="hero-title-gradient">
                Actually Work
              </span>
            </h1>
            <p className="hero-description">
              Connect with top creative talent, manage projects seamlessly, and get stunning results. 
              The platform that makes creative collaboration effortless.
            </p>
            <div className="hero-buttons">
              <Link href="/auth/signup" className="btn-primary btn-lg">
                Start Creating
                <ArrowRight size={20} />
              </Link>
              <Link href="#features" className="btn-outline btn-lg">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '96px 16px', background: 'white' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 className="text-heading" style={{ marginBottom: '16px' }}>Everything You Need to Create</h2>
            <p style={{ fontSize: '1.25rem', color: 'var(--text-light)', maxWidth: '600px', margin: '0 auto' }}>
              From brief creation to final delivery, we've got your creative workflow covered.
            </p>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '32px' 
          }}>
            <div className="card" style={{ padding: '32px', transition: 'all 0.3s ease' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#dbeafe',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Users size={24} color="#3b82f6" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Smart Matching</h3>
              <p style={{ color: 'var(--text-light)' }}>
                Our AI matches you with the perfect creative talent based on your project needs and style preferences.
              </p>
            </div>

            <div className="card" style={{ padding: '32px', transition: 'all 0.3s ease' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#d1fae5',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Zap size={24} color="#10b981" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Fast Turnaround</h3>
              <p style={{ color: 'var(--text-light)' }}>
                Get your creative assets delivered in record time with our streamlined workflow and communication tools.
              </p>
            </div>

            <div className="card" style={{ padding: '32px', transition: 'all 0.3s ease' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#f3e8ff',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Shield size={24} color="#8b5cf6" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Quality Guaranteed</h3>
              <p style={{ color: 'var(--text-light)' }}>
                Every project comes with our quality guarantee. Not satisfied? We'll make it right.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ 
        padding: '96px 16px', 
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        color: 'white',
        textAlign: 'center'
      }}>
        <div className="container">
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
            Ready to Bring Your Ideas to Life?
          </h2>
          <p style={{ fontSize: '1.25rem', marginBottom: '32px', opacity: 0.9 }}>
            Join thousands of brands who trust BlinkWorks for their creative needs.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/auth/signup"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: '600',
                color: '#3b82f6',
                background: 'white',
                borderRadius: '12px',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                gap: '8px'
              }}
            >
              Start Your Project
              <ArrowRight size={20} />
            </Link>
            <Link
              href="/auth/signin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: '600',
                color: 'white',
                border: '2px solid white',
                borderRadius: '12px',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '48px 16px', background: '#1f2937', color: 'white' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={20} color="white" />
            </div>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>BlinkWorks</span>
          </div>
          <p style={{ color: '#9ca3af', marginBottom: '32px' }}>
            The creative platform that connects brands with top talent for stunning results.
          </p>
          <p style={{ color: '#6b7280' }}>
            © 2024 BlinkWorks. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}