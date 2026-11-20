import React from 'react';
import { Form, Input, Button, Row, Col, Typography, Divider, Checkbox, message } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, GoogleOutlined, FacebookFilled } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import './SignUp.css';

const { Title, Text } = Typography;

const Signup = () => {
  const { signUp, signInWithGoogle, loading } = useAuth();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get client ID from environment variables
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSubmit = async (values) => {
    const { username, email, password } = values;
    try {
      await signUp(username, email, password);
      message.success('SignUp successful!');
      navigate('/profile');
    } catch (error) {
      console.error('Signup error:', error);
      message.error(error.message || 'Signup failed. Please try again.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { credential } = credentialResponse;
      await signInWithGoogle(credential);
      message.success('Google signup successful!');
      const redirectPath = location.state?.from?.pathname || "/chat";
      navigate(redirectPath);
    } catch (error) {
      console.error('Google signup error:', error);
      message.error(error.message || 'Google signup failed. Please try again.');
    }
  };
  return (
    <div className="signup-container">
      <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
        <Col xs={24} sm={20} md={16} lg={12} xl={8}>
          <div className="signup-card">
            <Title level={2} className="signup-title" style={{ color: "#f64a8a" }}>
              Create Your Account
            </Title>
            <Text type="secondary" className="signup-subtitle">
              Join us to get started
            </Text>

            <Form
              form={form}
              name="signup-form"
              onFinish={handleSubmit}
              className="signup-form"
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: 'Please input your full name!' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Full Name"
                  size="large"
                />
              </Form.Item>

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
                rules={[
                  { required: true, message: 'Please input your password!' },
                  { min: 8, message: 'Password must be at least 8 characters!' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Password"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Please confirm your password!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject('The two passwords do not match!');
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Confirm Password"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="agreement"
                valuePropName="checked"
                rules={[
                  {
                    validator: (_, value) =>
                      value ? Promise.resolve() : Promise.reject('You must agree to the terms and conditions!'),
                  },
                ]}
              >
                <Checkbox>
                  I agree to the <Link to="/terms">terms and conditions</Link>
                </Checkbox>
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
                  Sign Up
                </Button>
              </Form.Item>

              <Divider plain>Or sign up with</Divider>

              <Row gutter={16} className="social-signup-container">
                <Col span={12}>
                  <GoogleOAuthProvider clientId={CLIENT_ID}>
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => message.error('Google signup failed. Please try again.')}
                      useOneTap
                      shape="rectangular"
                      text="signup_with"
                      width="100%"
                    />
                  </GoogleOAuthProvider>
                </Col>
                <Col span={12}>
                  <Button
                    icon={<FacebookFilled />}
                    size="large"
                    block
                    className="social-btn facebook-btn"
                  >
                    Facebook
                  </Button>
                </Col>
              </Row>

              <div className="login-cta">
                <Text>Already have an account? </Text>
                <Link to="/login">Log in</Link>
              </div>
            </Form>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Signup;