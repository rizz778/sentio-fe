import React from 'react';
import { Row, Col, Typography, message } from 'antd';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import './SignUp.css';

const { Title, Text, Paragraph } = Typography;

const Signup = () => {
  const { signInWithGoogle, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // If already authenticated, redirect immediately to profile or chat
  React.useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = location.state?.from?.pathname || '/profile';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { credential } = credentialResponse;
      if (!credential) {
        message.error('No credential received from Google.');
        return;
      }
      await signInWithGoogle(credential);
      message.success('Account ready! Welcome to Sentio.');
      const redirectPath = location.state?.from?.pathname || '/profile';
      navigate(redirectPath, { replace: true });
    } catch (error) {
      console.error('Google signup error:', error);
      message.error(error.message || 'Google authentication failed. Please try again.');
    }
  };

  return (
    <div className="signup-container">
      <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
        <Col xs={24} sm={20} md={16} lg={12} xl={8}>
          <div className="signup-card" style={{ textAlign: 'center', padding: '40px 32px' }}>
            <Title level={2} className="signup-title" style={{ color: '#f64a8a', marginBottom: 8 }}>
              Begin Your Journey
            </Title>
            <Paragraph type="secondary" style={{ fontSize: '15px', marginBottom: 32 }}>
              Create your secure Sentio account instantly with Google. No passwords to remember.
            </Paragraph>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
              <GoogleOAuthProvider clientId={CLIENT_ID}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => message.error('Google Sign-In failed. Please try again.')}
                  useOneTap
                  theme="filled_blue"
                  size="large"
                  text="signup_with"
                  shape="pill"
                  width="280"
                />
              </GoogleOAuthProvider>
            </div>

            {loading && <Text type="secondary">Setting up your profile...</Text>}

            <div style={{ marginTop: 24 }}>
              <Text type="secondary">Already have an account? </Text>
              <Link to="/login" style={{ color: '#f64a8a', fontWeight: 'bold' }}>Log in</Link>
            </div>

            <div style={{ marginTop: 28, borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                By signing up, you agree to our{' '}
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

export default Signup;