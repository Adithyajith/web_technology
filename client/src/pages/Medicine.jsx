
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";

export default function Medicine() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("careconnect_token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    async function loadMedicines() {
      try {
        const data = await apiRequest("/medicines", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setMedicines(data);
      } catch (err) {
        setError(err.message);
        if (err.message.includes("session has expired")) {
          localStorage.removeItem("careconnect_token");
          localStorage.removeItem("careconnect_user");
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    }

    loadMedicines();
  }, [token, navigate]);

  async function addMedicine(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const medicine = await apiRequest("/medicines", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, dosage, time }),
      });

      setMedicines((previous) => [medicine, ...previous]);
      setName("");
      setDosage("");
      setTime("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteMedicine(id) {
    setError("");

    try {
      await apiRequest(`/medicines/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setMedicines((previous) =>
        previous.filter((medicine) => medicine._id !== id)
      );
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Medicine Details</h1>
        <p>Add and manage your medicines.</p>

        {error && <p className="message error">{error}</p>}

        <form onSubmit={addMedicine}>
          <label htmlFor="medicine-name">Medicine Name</label>
          <input
            id="medicine-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label htmlFor="medicine-dosage">Dosage</label>
          <input
            id="medicine-dosage"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="e.g. 1 tablet"
            required
          />

          <label htmlFor="medicine-time">Time</label>
          <input
            id="medicine-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Add Medicine"}
          </button>
        </form>

        <hr />

        <h2>My Medicines ({medicines.length})</h2>

        {loading ? (
          <p>Loading medicines...</p>
        ) : medicines.length === 0 ? (
          <p>No medicines added yet.</p>
        ) : (
          medicines.map((medicine) => (
            <div
              key={medicine._id}
              className="reminder-item"
              style={{
                border: "1px solid #ccd6cf",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "12px",
              }}
            >
              <p><strong>Name:</strong> {medicine.name}</p>
              <p><strong>Dosage:</strong> {medicine.dosage}</p>
              <p><strong>Time:</strong> {medicine.time}</p>

              <button
                type="button"
                onClick={() => deleteMedicine(medicine._id)}
              >
                Delete
              </button>
            </div>
          ))
        )}

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    </main>
  );
}
