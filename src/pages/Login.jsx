import React from 'react';
import { Row, Col, Typography, message } from 'antd';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const { Title, Text, Paragraph } = Typography;

const Login = () => {
  const { signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { credential } = credentialResponse;
      if (!credential) {
        message.error('No credential received from Google.');
        return;
      }
      await signInWithGoogle(credential);
      message.success('Signed in successfully!');
      const redirectPath = location.state?.from?.pathname || '/chat';
      navigate(redirectPath);
    } catch (error) {
      console.error('Google login error:', error);
      message.error(error.message || 'Google authentication failed. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
        <Col xs={24} sm={20} md={16} lg={12} xl={8}>
          <div className="login-card" style={{ textAlign: 'center', padding: '40px 32px' }}>
            <Title level={2} className="login-title" style={{ color: '#f64a8a', marginBottom: 8 }}>
              Welcome to Sentio
            </Title>
            <Paragraph type="secondary" style={{ fontSize: '15px', marginBottom: 32 }}>
              Your compassionate, AI-powered mental wellness companion. Sign in securely with your Google account to begin.
            </Paragraph>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
              <GoogleOAuthProvider clientId={CLIENT_ID}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => message.error('Google Sign-In failed. Please try again.')}
                  useOneTap
                  theme="filled_blue"
                  size="large"
                  text="signin_with"
                  shape="pill"
                  width="280"
                />
              </GoogleOAuthProvider>
            </div>

            {loading && <Text type="secondary">Authenticating with Sentio...</Text>}

            <div style={{ marginTop: 32, borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                By signing in, you agree to our{' '}
                <Link to="/terms" style={{ color: '#f64a8a' }}>Terms of Service</Link>{' '}
                and{' '}
                <Link to="/privacy" style={{ color: '#f64a8a' }}>Privacy Policy</Link>.
              </Text>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Login;
