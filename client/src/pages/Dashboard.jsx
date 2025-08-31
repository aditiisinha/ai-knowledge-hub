import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Dashboard = ({ setIsAuthenticated }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");   // clear token
    setIsAuthenticated(false);
    navigate("/login");                 // redirect to login
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
          <p>Name: {user.username}</p>
          <p>Email: {user.email}</p>
          <p>Role: {user.role}</p>
        </div>
      )}

      <div>
        <h2>Quick Actions</h2>
        <button onClick={() => navigate('/documents/new')}>Create Document</button>
        <button onClick={() => navigate('/documents')}>View Documents</button>
        <button onClick={() => navigate('/search')}>Search</button>
      </div>


      {/* 🔴 Logout button here */}
      <div>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
};

export default Dashboard;
