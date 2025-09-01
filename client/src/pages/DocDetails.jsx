import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const DocDetails = () => {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`http://localhost:5000/api/docs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDoc(res.data);
      } catch (err) {
        console.error(err);
        alert("Failed to fetch document");
      }
    };

    fetchDoc();
  }, [id]);

  if (!doc) return <p>Loading document...</p>;

  return (
    <div>
      <h2>{doc.title}</h2>
      <p>{doc.content}</p>
    </div>
  );
};

export default DocDetails;
