import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import "./App.css";

// Lazy-loaded pages (Code Splitting for fast startup and lightweight memory)
const Home = lazy(() => import("./pages/Home"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/SignUp"));
const Resource = lazy(() => import("./pages/Resource.jsx"));
const About2 = lazy(() => import("./pages/About2.jsx"));
const Helpline = lazy(() => import("./pages/Helpline.jsx"));
const SelfAssessment = lazy(() => import("./pages/SelfAssessment.jsx"));
// const TestPage = lazy(() => import("./components/TestPage.jsx"));
const Therapists = lazy(() => import("./pages/Therapists.jsx"));
const TherapistBookingPage = lazy(() => import("./pages/TherapistBookingPage.jsx"));
const RelaxationToolsPage = lazy(() => import("./pages/RelaxationToolsPage.jsx"));
const CommunityForum = lazy(() => import("./pages/CommunityForum.jsx"));
const TabPage = lazy(() => import("./pages/TabPage.jsx"));
const TwoTabPage = lazy(() => import("./pages/TwoTabPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const Dashboard = lazy(() => import("./components/Dashboard.jsx"));
const BuyToken = lazy(() => import("./pages/BuyToken.jsx"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[70vh] w-full">
    <div className="w-10 h-10 border-4 border-pink-200 border-t-[#f64a8a] rounded-full animate-spin" />
  </div>
);

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/chat" replace /> : <Login />} />
          <Route path="/signup" element={isAuthenticated ? <Navigate to="/chat" replace /> : <Signup />} />
          <Route path="/resource" element={<Resource />} />
          <Route path="/about" element={<About2 />} />

          {/* Protected Routes */}
          <Route path="/pricing" element={isAuthenticated ? <BuyToken /> : <Navigate to="/login" />} />
          <Route path="/token" element={<Navigate to="/pricing" replace />} />
          <Route path="/avatarexp" element={<Navigate to="/" replace />} />
          <Route path="/helpline" element={isAuthenticated ? <Helpline /> : <Navigate to="/login" />} />
          <Route path="/selfassessment" element={isAuthenticated ? <SelfAssessment /> : <Navigate to="/login" />} />
          {/* <Route path="/test/depression" element={isAuthenticated ? <TestPage /> : <Navigate to="/login" />} /> */}
          <Route path="/therapists" element={isAuthenticated ? <Therapists /> : <Navigate to="/login" />} />
          <Route path="/therapist_booking" element={isAuthenticated ? <TherapistBookingPage /> : <Navigate to="/login" />} />
          <Route path="/relaxationtools" element={isAuthenticated ? <RelaxationToolsPage /> : <Navigate to="/login" />} />
          <Route path="/communityforum" element={isAuthenticated ? <CommunityForum /> : <Navigate to="/login" />} />
          <Route path="/tabpage" element={isAuthenticated ? <TabPage /> : <Navigate to="/login" />} />
          <Route path="/twotabpage" element={isAuthenticated ? <TwoTabPage /> : <Navigate to="/login" />} />
          <Route path="/chat" element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  );
}
