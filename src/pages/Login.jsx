import React from 'react';
import { Form, Input, Button, Row, Col, Typography, Divider, Checkbox, message } from 'antd';
import { MailOutlined, LockOutlined, GoogleOutlined, FacebookFilled } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const { Title, Text } = Typography;

const Login = () => {
  const { signInWithEmail, signInWithGoogle, loading } = useAuth();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  // Get client ID from environment variables
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSubmit = async (values) => {
    const { email, password } = values;
    try {
      await signInWithEmail(email, password);
      message.success('Login successful!');
      const redirectPath = location.state?.from?.pathname || "/chat";
      navigate(redirectPath);
    } catch (error) {
      console.error('Login error:', error);
      message.error(error.message || 'Login failed. Please try again.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { credential } = credentialResponse;
      await signInWithGoogle(credential);
      message.success('Google login successful!');
      const redirectPath = location.state?.from?.pathname || "/chat";
      navigate(redirectPath);
    } catch (error) {
      console.error('Google login error:', error);
      message.error(error.message || 'Google login failed. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
        <Col xs={24} sm={20} md={16} lg={12} xl={8}>
          <div className="login-card">
            <Title level={2} className="login-title" style={{ color: "#f64a8a" }}>
              Welcome Back
            </Title>
            <Text type="secondary" className="login-subtitle">
              Please sign in to continue
            </Text>

            <Form
              form={form}
              name="login-form"
              initialValues={{ remember: true }}
              onFinish={handleSubmit}
              className="login-form"
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email!' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Email"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Please input your password!' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Password"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Row justify="space-between">
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox>Remember me</Checkbox>
                  </Form.Item>
                  <Link to="/forgot-password">Forgot password?</Link>
                </Row>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={loading}
                  block
                  style={{ backgroundColor: "#f64a8a" }}
                >
                  Sign In
                </Button>
              </Form.Item>

              <Divider plain>Or continue with</Divider>

              <div className="social-login-container">
                <GoogleOAuthProvider clientId={CLIENT_ID}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => message.error('Google login failed. Please try again.')}
                    useOneTap
                    theme="filled_blue"
                    size="large"
                    width="100%"
                    text="signin_with"
                    logo_alignment="center"
                  />
                </GoogleOAuthProvider>
                
                <Button
                  icon={<FacebookFilled />}
                  size="large"
                  className="facebook-login-btn"
                  block
                  style={{ 
                    backgroundColor: "#3b5998", 
                    color: "white",
                    marginTop: "10px" 
                  }}
                >
                  Continue with Facebook
                </Button>
              </div>

              <div className="register-cta">
                <Text>Don't have an account? </Text>
                <Link to="/signup">Create account</Link>
              </div>
            </Form>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Login;
