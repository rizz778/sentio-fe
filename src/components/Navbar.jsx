import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import logo6 from '../assets/images/logo6.jpg';
import { fetchUserProfile } from "../services/profileApi";
import { useAuth } from "../hooks/useAuth";

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (isAuthenticated) {
        try {
          const profile = await fetchUserProfile();
          setUserProfile(profile);
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    };

    loadProfile();
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    signOut();
    setUserProfile(null);
    setDropdownOpen(false);
    navigate("/");
  };

  const getOptimizedImageUrl = (url, width = 300) => {
    if (!url) return null;
    if (url.includes('cloudinary.com')) {
      const urlParts = url.split('/upload/');
      if (urlParts.length === 2) {
        return `${urlParts[0]}/upload/w_${width},c_fill,g_face/${urlParts[1]}`;
      }
    }
    return url;
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm md:text-base font-medium px-4 py-2 rounded-full transition-all duration-200 ${
      isActive
        ? "bg-white text-[#f64a8a] shadow-sm font-semibold"
        : "text-white hover:bg-white/20 hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#ff9bbd] via-[#f782ab] to-[#f46698] shadow-md backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Left: User Profile Icon */}
        <div className="flex items-center min-w-[60px]" ref={dropdownRef}>
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/60 rounded-full"
                title="Account Menu"
              >
                {userProfile && userProfile.profilePicture && userProfile.profilePicture.url ? (
                  <img
                    src={getOptimizedImageUrl(userProfile.profilePicture.url, 300)}
                    alt="profile"
                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '';
                      e.target.className = "hidden";
                      e.target.parentNode.innerHTML = `<div class="w-10 h-10 rounded-full bg-white text-[#f64a8a] font-bold flex items-center justify-center shadow-sm border-2 border-white">
                        ${userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                      </div>`;
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white text-[#f64a8a] font-bold flex items-center justify-center shadow-sm border-2 border-white">
                    {userProfile && userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-3 w-52 bg-white rounded-xl shadow-xl py-2 z-50 border border-pink-100 animate-in fade-in slide-in-from-top-2 duration-150">
                  {userProfile && (
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-400 font-medium">Signed in as</p>
                      <p className="text-sm font-semibold text-gray-800 truncate">{userProfile.name}</p>
                    </div>
                  )}
                  <NavLink
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    My Profile
                  </NavLink>
                  <NavLink
                    to="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Dashboard
                  </NavLink>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <NavLink
              to="/login"
              className="text-white text-sm font-medium hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors"
            >
              Sign In
            </NavLink>
          )}
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2.5">
          <NavLink to="/" className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/chat" className={navLinkClass}>
            Chat
          </NavLink>
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/profile" className={navLinkClass}>
            Profile
          </NavLink>
          <NavLink to="/therapists" className={navLinkClass}>
            Therapists
          </NavLink>
          <NavLink to="/selfassessment" className={navLinkClass}>
            Assessment
          </NavLink>
          <NavLink to="/tabpage" className={navLinkClass}>
            Resources
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About Us
          </NavLink>
        </nav>

        {/* Right: Sentio Logo */}
        <div className="flex items-center justify-end min-w-[60px]">
          <NavLink to="/" className="flex items-center gap-2 group">
            <img
              src={logo6}
              alt="Sentio Logo"
              className="h-11 w-auto object-contain rounded-lg shadow-xs group-hover:scale-105 transition-transform"
            />
          </NavLink>
        </div>
      </div>

      {/* Mobile Nav Drawer Row */}
      <div className="md:hidden flex overflow-x-auto px-3 py-2 gap-2 border-t border-white/20 no-scrollbar">
        <NavLink to="/" className={navLinkClass}>
          Home
        </NavLink>
        <NavLink to="/chat" className={navLinkClass}>
          Chat
        </NavLink>
        <NavLink to="/dashboard" className={navLinkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/profile" className={navLinkClass}>
          Profile
        </NavLink>
        <NavLink to="/therapists" className={navLinkClass}>
          Therapists
        </NavLink>
        <NavLink to="/selfassessment" className={navLinkClass}>
          Assessment
        </NavLink>
        <NavLink to="/tabpage" className={navLinkClass}>
          Resources
        </NavLink>
        <NavLink to="/about" className={navLinkClass}>
          About
        </NavLink>
      </div>
    </header>
  );
};

export default Navbar;
