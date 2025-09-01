import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const DocForm = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/docs",
        { title, content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Document created!");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Failed to create document");
    }
  };

  return (
    <div>
      <h2>Create New Document</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        ></textarea>
        <button type="submit">Save</button>
      </form>
    </div>
  );
};

export default DocForm;
