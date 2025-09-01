import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import DocList from "../pages/DocList";

const Dashboard = ({ setIsAuthenticated }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setUser(response.data);
      } catch (error) {
        console.error("Error fetching user data:", error);
        // If unauthorized, redirect to login
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token"); // clear token
    setIsAuthenticated(false);
    navigate("/login"); // redirect to login
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h1>Dashboard</h1>

      {user && (
        <div>
          <h2>Your Profile</h2>
          <p><strong>Name:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
        </div>
      )}

      <div>
        <h2>Quick Actions</h2>
        <Link to="/docs/new">
          <button>Create Document</button>
        </Link>
        <Link to="/search">
          <button>Search</button>
        </Link>
      </div>

      {/* Show documents list */}
      <div>
        <h2>Your Documents</h2>
        <DocsList />
      </div>

      {/* Logout */}
      <div>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
};

export default Dashboard;
