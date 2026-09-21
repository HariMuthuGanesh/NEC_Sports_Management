import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { setAuthToken } from '../../utils/security';
import Button from '../../components/common/Button';

export default function OAuthCallbackPage({ onLoginSuccess, onNavigate }) {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const errorParam = params.get('error');

        if (errorParam) {
          setError(decodeURIComponent(errorParam));
          setLoading(false);
          return;
        }

        if (!token) {
          setError('No authentication token received.');
          setLoading(false);
          return;
        }

        // Store JWT token
        setAuthToken(token);

        // Fetch user profile using the token
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const resData = await response.json();
        
        if (response.ok && resData.success) {
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
          login(sessionUser, token);

          if (typeof onLoginSuccess === 'function') {
            onLoginSuccess(sessionUser);
          }
        } else {
          setError(resData.error?.message || 'Failed to fetch user profile.');
        }
      } catch (err) {
        setError('Authentication process failed. Please try again.');
      } finally {
        setLoading(false);
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
