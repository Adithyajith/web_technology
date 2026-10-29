
import { Link, useNavigate } from "react-router-dom";
export default function Dashboard() {
  const navigate = useNavigate();

  let user = null;

  try {
    user = JSON.parse(
      localStorage.getItem("careconnect_user") || "null"
    );
  } catch {
    user = null;
  }

  function handleLogout() {
    localStorage.removeItem("careconnect_token");
    localStorage.removeItem("careconnect_user");
    navigate("/login");
  }

  if (!user) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Please log in</h1>
          <button onClick={() => navigate("/login")}>
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  const roleMessages = {
    elderly: "View your care information and stay connected.",
    caregiver: "Welcome! You can support the people in your care.",
    admin: "Manage and monitor the CareConnect application.",
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>CareConnect</h1>
        <h2>Hello, {user.name}!</h2>

        <p>{roleMessages[user.role] || "Welcome to your dashboard."}</p>

        <hr />

        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p>
          <strong>Role:</strong>{" "}
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </p>
       
        <Link to="/medicine">Manage Medicine Reminders</Link>
        
        <button onClick={handleLogout}>Logout</button>
      </div>
    </main>
  );
}
