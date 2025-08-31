import { useNavigate, Link } from "react-router-dom";

function Navbar({ isAuthenticated, setIsAuthenticated }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");   // clear token
    setIsAuthenticated(false);
    navigate("/login");
  };

  return (
    <nav>
      {isAuthenticated ? (
        <>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/documents">Documents</Link>
          <Link to="/search">Search</Link>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
       <></>
      )}
    </nav>
  );
}

export default Navbar;
