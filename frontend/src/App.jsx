
import React, { useEffect, useState } from 'react';

const API = 'https://crime-reporting-system-mern.onrender.com';

export default function App() {
  const [page, setPage] = useState('home');

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('crimeUser') || 'null');
    } catch {
      return null;
    }
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [complaints, setComplaints] = useState([]);
  const [sos, setSos] = useState([]);
  const [users, setUsers] = useState([]);

  const notify = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 4000);
  };

  // Safe API request with timeout
  async function apiRequest(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      const text = await response.text();

      let data;

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {
          message: text || 'Invalid server response',
        };
      }

      return { response, data };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(
          'The server is taking too long to respond. Please try again.'
        );
      }

      throw new Error(
        'Unable to connect to the server. Please check your connection and try again.'
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  const logout = () => {
    localStorage.removeItem('crimeUser');
    setUser(null);
    setPage('home');
    notify('Logged out successfully');
  };

  // REGISTER
  async function register(e) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    const form = e.target;
    const data = Object.fromEntries(new FormData(form));

    try {
      const { response, data: result } = await apiRequest(
        API + '/api/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      notify(result.message || 'Registration completed.');

      if (response.ok) {
        form.reset();
        setPage('login');
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // LOGIN
  async function login(e) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    const data = Object.fromEntries(new FormData(e.target));

    try {
      const { response, data: result } = await apiRequest(
        API + '/api/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        localStorage.setItem(
          'crimeUser',
          JSON.stringify(result.user)
        );

        setUser(result.user);
        setPage('home');

        notify(result.message || 'Login successful.');
      } else {
        notify(result.message || 'Login failed.');
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // REPORT COMPLAINT
  async function report(e) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    const form = e.target;
    const data = Object.fromEntries(new FormData(form));

    data.anonymous = data.anonymous === 'on';
    data.userEmail = user?.email || null;

    try {
      const { response, data: result } = await apiRequest(
        API + '/api/complaints',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        notify(
          'Complaint submitted. Tracking ID: ' +
            result.complaintId
        );

        form.reset();
      } else {
        notify(
          result.message || 'Unable to submit complaint.'
        );
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // LOAD COMPLAINTS
  async function loadComplaints() {
    if (!user?.email && user?.role !== 'admin') return;

    const url =
      user?.role === 'admin'
        ? API + '/api/complaints'
        : API +
          '/api/complaints?email=' +
          encodeURIComponent(user?.email || '');

    try {
      const { response, data } = await apiRequest(url);

      if (response.ok && Array.isArray(data)) {
        setComplaints(data);
      } else {
        setComplaints([]);

        notify(
          data.message || 'Unable to load complaints.'
        );
      }
    } catch (error) {
      notify(error.message);
    }
  }

  // UPDATE COMPLAINT STATUS
  async function updateStatus(id, status) {
    if (loading) return;

    setLoading(true);

    try {
      const { response, data } = await apiRequest(
        API + '/api/complaints/' + id,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        notify(data.message || 'Status updated');
        await loadComplaints();
      } else {
        notify(
          data.message || 'Unable to update status.'
        );
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // LOAD SOS
  async function loadSOS() {
    try {
      const { response, data } = await apiRequest(
        API + '/api/sos'
      );

      if (response.ok && Array.isArray(data)) {
        setSos(data);
      } else {
        setSos([]);
      }
    } catch (error) {
      notify(error.message);
    }
  }

  // LOAD USERS
  async function loadUsers() {
    try {
      const { response, data } = await apiRequest(
        API + '/api/users'
      );

      if (response.ok && Array.isArray(data)) {
        setUsers(data);
      } else {
        setUsers([]);

        notify(
          data.message || 'Unable to load users.'
        );
      }
    } catch (error) {
      notify(error.message);
    }
  }

  // SEND SOS
  function sendSOS() {
    if (loading) return;

    if (!navigator.geolocation) {
      notify(
        'Geolocation is not supported by this device.'
      );

      return;
    }

    setLoading(true);

    notify('Getting your location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { response, data } = await apiRequest(
            API + '/api/sos',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userEmail: user?.email || null,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }),
            }
          );

          if (response.ok) {
            notify(
              data.message || 'SOS submitted.'
            );
          } else {
            notify(
              data.message || 'Unable to send SOS.'
            );
          }
        } catch (error) {
          notify(error.message);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        notify('Location permission denied.');
      }
    );
  }

  // LOAD DATA WHEN PAGE CHANGES
  useEffect(() => {
    if (page === 'track' || page === 'admin') {
      loadComplaints();
    }

    if (page === 'admin') {
      loadSOS();
      loadUsers();
    }
  }, [page]);

  // NAVIGATION
  const Nav = () => (
    <nav>
      <strong>🛡 Crime Reporting System</strong>

      {user && (
        <>
          <button onClick={() => setPage('report')}>
            Report
          </button>

          <button onClick={() => setPage('track')}>
            Track
          </button>

          <button onClick={() => setPage('sos')}>
            SOS
          </button>
        </>
      )}

      {user?.role === 'admin' && (
        <button onClick={() => setPage('admin')}>
          Dashboard
        </button>
      )}

      {!user ? (
        <>
          <button onClick={() => setPage('login')}>
            Login
          </button>

          <button onClick={() => setPage('register')}>
            Register
          </button>
        </>
      ) : (
        <button onClick={logout}>
          Logout
        </button>
      )}
    </nav>
  );

  let content;

  // REGISTER
  if (page === 'register') {
    content = (
      <>
        <section className="hero">
          <h1>Create Account</h1>

          <form onSubmit={register}>
            <input
              name="name"
              placeholder="Full name"
              required
            />

            <input
              name="email"
              type="email"
              placeholder="Email"
              required
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              required
            />

            <button type="submit" disabled={loading}>
              {loading
                ? 'Creating account...'
                : 'Register'}
            </button>
          </form>
        </section>
      </>
    );
  }

  // LOGIN
  else if (page === 'login') {
    content = (
      <>
        <section className="hero">
          <h1>Login</h1>

          <form onSubmit={login}>
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              required
            />

            <button type="submit" disabled={loading}>
              {loading
                ? 'Logging in...'
                : 'Login'}
            </button>
          </form>
        </section>
      </>
    );
  }

  // REPORT
  else if (page === 'report') {
    content = (
      <>
        <section>
          <h1>File a Complaint</h1>

          <form onSubmit={report}>
            <select
              name="crimeType"
              required
            >
              <option value="">
                Select crime type
              </option>

              <option>Theft</option>
              <option>Fraud</option>
              <option>Harassment</option>
              <option>Violence</option>
              <option>Cybercrime</option>
              <option>Other</option>
            </select>

            <textarea
              name="description"
              placeholder="Describe the incident"
              required
            />

            <input
              name="location"
              placeholder="Incident location"
              required
            />

            <label>
              <input
                name="anonymous"
                type="checkbox"
              />

              Submit anonymously
            </label>

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Submitting complaint...'
                : 'Submit Complaint'}
            </button>
          </form>
        </section>
      </>
    );
  }

  // TRACK
  else if (page === 'track') {
    content = (
      <>
        <section>
          <h1>My Complaints</h1>

          {complaints.map((c) => (
            <article key={c._id}>
              <b>{c.complaintId}</b>

              <span>
                {c.status}
              </span>

              <p>
                {c.crimeType} — {c.location}
              </p>

              <small>
                {new Date(
                  c.createdAt
                ).toLocaleString()}
              </small>
            </article>
          ))}

          {!complaints.length && (
            <p>No complaints found.</p>
          )}
        </section>
      </>
    );
  }

  // SOS
  else if (page === 'sos') {
    content = (
      <>
        <section>
          <h1>Emergency SOS</h1>

          <p className="warning">
            Academic prototype: this does not contact
            real police or emergency services.
          </p>

          <button
            className="sos"
            onClick={sendSOS}
            disabled={loading}
          >
            {loading
              ? 'Sending SOS...'
              : 'SEND SOS'}
          </button>
        </section>
      </>
    );
  }

  // ADMIN DASHBOARD
  else if (page === 'admin') {
    const resolvedCount = complaints.filter(
      (c) => c.status === 'Resolved'
    ).length;

    const activeCount = complaints.filter(
      (c) => c.status !== 'Resolved'
    ).length;

    content = (
      <>
        <section className="hero">
          <h1>Admin Dashboard</h1>

          <p>
            Monitor users, complaints and active SOS
            alerts.
          </p>
        </section>

        <section>
          <h2>Dashboard Statistics</h2>

          <article>
            <b>Total Users</b>
            <h2>{users.length}</h2>
          </article>

          <article>
            <b>Total Complaints</b>
            <h2>{complaints.length}</h2>
          </article>

          <article>
            <b>Active Complaints</b>
            <h2>{activeCount}</h2>
          </article>

          <article>
            <b>Resolved Complaints</b>
            <h2>{resolvedCount}</h2>
          </article>

          <article>
            <b>Active SOS Alerts</b>
            <h2>{sos.length}</h2>
          </article>
        </section>

        <section>
          <h2>Registered Users</h2>

          {users.map((u) => (
            <article key={u._id}>
              <b>{u.name}</b>

              <p>{u.email}</p>

              <small>
                Role: {u.role}
                <br />
                Registered:{' '}
                {new Date(
                  u.createdAt
                ).toLocaleString()}
              </small>
            </article>
          ))}

          {!users.length && (
            <p>No users found.</p>
          )}
        </section>

        <section>
          <h2>Active SOS Alerts</h2>

          {sos.map((a) => (
            <article key={a._id}>
              <b>🚨 SOS Alert</b>

              <p>
                📍 {a.latitude}, {a.longitude}
              </p>

              <small>
                User:{' '}
                {a.userEmail || 'Unknown'}
                <br />
                Time:{' '}
                {new Date(
                  a.createdAt
                ).toLocaleString()}
              </small>
            </article>
          ))}

          {!sos.length && (
            <p>No active SOS alerts.</p>
          )}
        </section>

        <section>
          <h2>All Complaints</h2>

          {complaints.map((c) => (
            <article key={c._id}>
              <b>{c.complaintId}</b>

              <span>
                {c.status}
              </span>

              <p>
                <strong>Crime:</strong>{' '}
                {c.crimeType}
              </p>

              <p>
                <strong>Description:</strong>{' '}
                {c.description}
              </p>

              <p>
                <strong>Location:</strong>{' '}
                {c.location}
              </p>

              <p>
                <strong>User:</strong>{' '}
                {c.anonymous
                  ? 'Anonymous'
                  : c.userEmail || 'Unknown'}
              </p>

              <small>
                Submitted:{' '}
                {new Date(
                  c.createdAt
                ).toLocaleString()}
              </small>

              <br />
              <br />

              <select
                value={c.status}
                disabled={loading}
                onChange={(e) =>
                  updateStatus(
                    c._id,
                    e.target.value
                  )
                }
              >
                <option>
                  Submitted
                </option>

                <option>
                  Under Review
                </option>

                <option>
                  In Progress
                </option>

                <option>
                  Resolved
                </option>
              </select>
            </article>
          ))}

          {!complaints.length && (
            <p>No complaints found.</p>
          )}
        </section>
      </>
    );
  }

  // HOME
  else {
    content = (
      <>
        <section className="hero">
          <h1>
            Report. Track. Respond.
          </h1>

          <p>
            Digital crime reporting with anonymous
            complaints, tracking, SOS alerts and an
            admin dashboard.
          </p>

          {user ? (
            <button
              onClick={() =>
                setPage('report')
              }
            >
              File a Complaint
            </button>
          ) : (
            <button
              onClick={() =>
                setPage('register')
              }
            >
              Get Started
            </button>
          )}
        </section>
      </>
    );
  }

  return (
    <>
      <Nav />

      {message && (
        <div
          className="message"
          role="alert"
        >
          {message}
        </div>
      )}

      <main>{content}</main>
    </>
  );
}

