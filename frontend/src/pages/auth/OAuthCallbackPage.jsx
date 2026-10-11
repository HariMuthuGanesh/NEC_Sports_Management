import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Button from '../../components/common/Button';

export default function OAuthCallbackPage({ onLoginSuccess, onNavigate }) {
  const { login } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const success = params.get('success');
        const errorParam = params.get('error') || new URLSearchParams(window.location.hash.slice(1)).get('error');

        if (errorParam) {
          setError(decodeURIComponent(errorParam));
          return;
        }

        if (success !== '1') {
          setError('Authentication session was not established.');
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/me`, {
          credentials: 'include'
        });

        const resData = await response.json();
        
        if (response.ok && resData.success) {
          const userData = resData.data || resData.user || {};
          const sessionUser = {
            ...userData,
            role: userData.role,
            name: userData.username,
            email: userData.email,
            dept: userData.dept || userData.studentProfile?.department_code || 'Sports Office',
            deptId: userData.deptId || userData.studentProfile?.department_id || null,
            deptName: userData.deptName || 'Sports Directorate',
            title: userData.role,
            id: userData.username
          };
          login(sessionUser);

          if (typeof onLoginSuccess === 'function') {
            onLoginSuccess(sessionUser);
          }
        } else {
          setError(resData.error?.message || 'Failed to fetch user profile.');
        }
      } catch (err) {
        setError('Authentication process failed. Please try again.');
      }
    };

    processCallback();
  }, [login, onLoginSuccess]);

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--nec-bg-body)', padding: '20px' }}>
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <AlertTriangle size={48} color="var(--nec-danger)" style={{ margin: '0 auto 15px' }} />
          <h2 style={{ marginBottom: '15px', color: 'var(--nec-text-main)' }}>Authentication Failed</h2>
          <p style={{ color: 'var(--nec-text-muted)', marginBottom: '25px' }}>{error}</p>
          <Button variant="primary" onClick={() => onNavigate('login')} style={{ width: '100%', justifyContent: 'center' }}>
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--nec-bg-body)' }}>
      <Loader2 size={48} color="var(--nec-primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
      <h2 style={{ color: 'var(--nec-text-main)' }}>Completing Sign In...</h2>
      <p style={{ color: 'var(--nec-text-muted)' }}>Please wait while we securely connect your account.</p>
    </div>
  );
}
