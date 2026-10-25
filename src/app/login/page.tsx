'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Globe2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('pvm_user', JSON.stringify(data.user));
          localStorage.setItem('pvm_auth', 'authenticated');
        }
        router.push('/');
      } else {
        setError(data.message || 'Invalid email or password');
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* 1. Left Showcase: Perfetti Van Melle Brand Experience */}
      <div className="login-brand-panel">
        <div className="brand-panel-top">
          <div className="brand-panel-logo-wrap">
            <Image
              src="/pvm-logo.png"
              alt="Perfetti Van Melle Logo"
              width={160}
              height={55}
              style={{ objectFit: 'contain', height: 48, width: 'auto' }}
              priority
            />
          </div>
          <div className="brand-panel-title">
            <h2>Perfetti Van Melle</h2>
            <p>Confectionery & Chewing Gum Global Leader</p>
          </div>
        </div>

        {/* Hero & Product Showcase */}
        <div className="brand-panel-hero">
          <div className="hero-pill-badge">
            <Sparkles size={14} style={{ color: '#fbbf24' }} />
            <span>Innovating to Sweeten the Future</span>
          </div>

          <h1 className="hero-headline">
            Unwrap a smile with <span>every visit</span>.
          </h1>

          <p className="hero-sub">
            The official Sales Force Automation (SFA) & Modern Trade intelligence portal for Perfetti Van Melle Bangladesh.
          </p>

          {/* Floating Glassmorphic Product Card with products.jpg */}
          <div className="products-showcase-card">
            <div className="products-img-wrap">
              <Image
                src="/products.jpg"
                alt="Perfetti Van Melle Confectionery Brands"
                width={140}
                height={140}
                className="products-img"
                priority
              />
            </div>
            <div className="products-card-content">
              <h4>Iconic Brands Loved Globally</h4>
              <p style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.4 }}>
                Delivering joy, fresh breath, and sweetness across Bangladesh.
              </p>
              <div className="brand-chips-wrap">
                <span className="brand-chip" style={{ background: 'rgba(56, 189, 248, 0.25)', border: '1px solid #38bdf8' }}>Mentos</span>
                <span className="brand-chip" style={{ background: 'rgba(251, 191, 36, 0.25)', border: '1px solid #fbbf24' }}>Alpenliebe</span>
                <span className="brand-chip" style={{ background: 'rgba(244, 114, 182, 0.25)', border: '1px solid #f472b6' }}>Chupa Chups</span>
                <span className="brand-chip" style={{ background: 'rgba(52, 211, 153, 0.25)', border: '1px solid #34d399' }}>Center Fresh</span>
                <span className="brand-chip" style={{ background: 'rgba(239, 68, 68, 0.25)', border: '1px solid #ef4444' }}>Center Fruit</span>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="brand-panel-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe2 size={16} style={{ color: '#38bdf8' }} />
            <span>Operating in 150+ Countries</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} style={{ color: '#34d399' }} />
            <span>Enterprise Intelligence Dashboard</span>
          </div>
        </div>
      </div>

      {/* 2. Right Panel: Modern Login Form */}
      <div className="login-form-panel">
        <div className="login-form-box">
          <div className="form-header">
            <div className="form-header-badge">
              <ShieldCheck size={13} />
              <span>Secure Authentication</span>
            </div>
            <h2 className="form-title">Welcome Back</h2>
            <p className="form-subtitle">
              Sign in with your enterprise credentials to access live sales operations and visit tracking.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="login-error-banner" role="alert" id="login-error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form with Autofill completely disabled */}
          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            {/* Fake hidden inputs to absorb browser autofill aggressiveness */}
            <input type="text" name="fakeusernameremembered" style={{ display: 'none' }} tabIndex={-1} />
            <input type="password" name="fakepasswordremembered" style={{ display: 'none' }} tabIndex={-1} />

            {/* Email Field */}
            <div className="login-field">
              <label htmlFor="pvm-user-email" className="login-label">
                Email Address
              </label>
              <div className="login-input-wrap">
                <Mail size={16} className="login-input-icon" />
                <input
                  type="email"
                  id="pvm-user-email"
                  name="pvm_portal_email"
                  required
                  placeholder="name@pvm.com"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="login-field">
              <label htmlFor="pvm-user-password" className="login-label">
                Password
              </label>
              <div className="login-input-wrap">
                <Lock size={16} className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="pvm-user-password"
                  name="pvm_portal_password"
                  required
                  placeholder="Enter your password"
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  id="btn-toggle-password"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#475569' }}>
                <input type="checkbox" defaultChecked />
                <span>Keep me signed in</span>
              </label>
              <span style={{ color: '#0b4ea2', fontWeight: 600, cursor: 'pointer' }} onClick={() => alert('Please contact PVM SFA IT Helpdesk')}>
                Help & Support
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-submit-login"
              className="btn-login-submit"
              disabled={loading}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Intelligence Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Dedicated "Powered by" Section without any box */}
          <div className="login-powered-section">
            <span className="powered-by-label">POWERED BY</span>
            <Image
              src="/sokrio-logo.png"
              alt="Sokrio Technologies Ltd."
              width={200}
              height={80}
              style={{ objectFit: 'contain', height: 54, width: 'auto' }}
              priority
            />
            <p className="powered-by-sub">Sokrio Technologies Ltd.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
