import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const DocsList = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/docs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDocs(res.data);
      } catch (err) {
        console.error(err);
        alert("Failed to fetch documents");
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>Your Documents</h2>
      {docs.length === 0 ? (
        <p>No documents found. <Link to="/docs/new">Create one</Link></p>
      ) : (
        <ul>
          {docs.map((doc) => (
            <li key={doc._id}>
              <Link to={`/docs/${doc._id}`}>{doc.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DocsList;
