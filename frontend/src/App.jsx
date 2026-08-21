import React, { useEffect, useState } from 'react';

const API = 'https://crime-reporting-system-mern.onrender.com';

export default function App() {
  const [page, setPage] = useState('home');

const [user, setUser] = useState(null);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [complaints, setComplaints] = useState([]);
  const [sos, setSos] = useState([]);
  const [users, setUsers] = useState([null]);

  const notify = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 4000);
  };

  async function apiRequest(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      const text = await response.text();

      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text || 'Invalid server response' };
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
    setUser(null);
    setPage('home');
    notify('Logged out successfully');
  };

  // =========================
  // REGISTER
  // =========================

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

      if (response.ok) {
        notify(result.message || 'Registration successful');
        form.reset();
        setPage('login');
      } else {
        notify(result.message || 'Registration failed');
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // LOGIN
  // =========================

async function login(e) {
  e.preventDefault();

  if (loading) return;

  setLoading(true);

  const data = Object.fromEntries(
    new FormData(e.target)
  );

  try {
    const { response, data: result } =
      await apiRequest(
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
      setUser(result.user);

      if (result.user.role === 'admin') {
        setPage('admin');
      } else if (result.user.role === 'police') {
        setPage('police');
      } else {
        setPage('home');
      }

      notify(
        result.message ||
          'Login successful'
      );
    } else {
      notify(
        result.message ||
          'Login failed'
      );
    }

  } catch (error) {
    notify(error.message);

  } finally {
    setLoading(false);
  }
}

  // =========================
  // REPORT
  // =========================

  async function report(e) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    const form = e.target;
    const data = Object.fromEntries(new FormData(form));

    data.anonymous = false;
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
        notify(result.message || 'Unable to submit complaint');
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // LOAD COMPLAINTS
  // =========================

  async function loadComplaints() {
    if (!user) return;

    let url = API + '/api/complaints';

    if (user.role === 'citizen') {
      url +=
        '?email=' +
        encodeURIComponent(user.email);
    }

    try {
      const { response, data } = await apiRequest(url);

      if (response.ok && Array.isArray(data)) {
        setComplaints(data);
      } else {
        setComplaints([]);
        notify(data.message || 'Unable to load complaints');
      }
    } catch (error) {
      notify(error.message);
    }
  }

  // =========================
  // LOAD USERS
  // =========================

  async function loadUsers() {
    try {
      const { response, data } = await apiRequest(
        API + '/api/users'
      );

      if (response.ok && Array.isArray(data)) {
        setUsers(data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      notify(error.message);
    }
  }

  // =========================
  // LOAD SOS
  // =========================

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

  // =========================
  // UPDATE STATUS
  // =========================

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
        notify('Status updated');
        await loadComplaints();
      } else {
        notify(data.message || 'Unable to update status');
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // CREATE POLICE ACCOUNT
  // =========================

  async function createPolice(e) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    const form = e.target;
    const data = Object.fromEntries(new FormData(form));

    try {
      const { response, data: result } = await apiRequest(
        API + '/api/users/police',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        notify('Police account created');
        form.reset();
        await loadUsers();
      } else {
        notify(result.message || 'Unable to create police account');
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // ASSIGN OFFICER
  // =========================

  async function assignOfficer(id, officerEmail) {
    if (!officerEmail) {
      notify('Select a police officer first');
      return;
    }

    setLoading(true);

    try {
      const { response, data } = await apiRequest(
        API + '/api/complaints/' + id + '/assign',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            officerEmail,
          }),
        }
      );

      if (response.ok) {
        notify('Officer assigned successfully');
        await loadComplaints();
      } else {
        notify(data.message || 'Unable to assign officer');
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // ACCEPT CASE
  // =========================

  async function acceptCase(id) {
    setLoading(true);

    try {
      const { response, data } = await apiRequest(
        API + '/api/complaints/' + id + '/accept',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            officerEmail: user.email,
          }),
        }
      );

      if (response.ok) {
        notify('Case accepted');
        await loadComplaints();
      } else {
        notify(data.message || 'Unable to accept case');
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // INVESTIGATION UPDATE
  // =========================

  async function addInvestigation(id, note) {
    if (!note.trim()) {
      notify('Enter an investigation update');
      return;
    }

    setLoading(true);

    try {
      const { response, data } = await apiRequest(
        API + '/api/complaints/' + id + '/investigation',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            officerEmail: user.email,
            note,
          }),
        }
      );

      if (response.ok) {
        notify('Investigation update added');
        await loadComplaints();
      } else {
        notify(data.message || 'Unable to add update');
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // COMPLETE INVESTIGATION
  // =========================

  async function completeInvestigation(
    id,
    resolutionDetails
  ) {
    setLoading(true);

    try {
      const { response, data } = await apiRequest(
        API + '/api/complaints/' + id + '/complete',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            officerEmail: user.email,
            resolutionDetails,
          }),
        }
      );

      if (response.ok) {
        notify('Investigation completed');
        await loadComplaints();
      } else {
        notify(data.message || 'Unable to complete investigation');
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // EVIDENCE UPLOAD
  // =========================

  async function uploadEvidence(id, file) {
    if (!file) {
      notify('Select a file first');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append('evidence', file);
      formData.append(
        'officerEmail',
        user.email
      );

      const { response, data } = await apiRequest(
        API + '/api/complaints/' + id + '/evidence',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        notify('Evidence uploaded successfully');
        await loadComplaints();
      } else {
        notify(data.message || 'Evidence upload failed');
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // SOS
  // =========================

  function sendSOS() {
    if (loading) return;

    if (!navigator.geolocation) {
      notify('Geolocation is not supported');
      return;
    }

    setLoading(true);
    notify('Getting your location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { response, data } =
            await apiRequest(
              API + '/api/sos',
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json',
                },
                body: JSON.stringify({
                  userEmail:
                    user?.email || null,
                  latitude:
                    position.coords.latitude,
                  longitude:
                    position.coords.longitude,
                }),
              }
            );

          if (response.ok) {
            notify(
              data.message ||
                'SOS submitted'
            );
          } else {
            notify(
              data.message ||
                'Unable to send SOS'
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
        notify('Location permission denied');
      }
    );
  }

  // =========================
  // LOAD DATA
  // =========================

  useEffect(() => {
    if (
      page === 'track' ||
      page === 'admin' ||
      page === 'police'
    ) {
      loadComplaints();
    }

    if (page === 'admin') {
      loadUsers();
      loadSOS();
    }
  }, [page]);

  // =========================
  // NAVIGATION
  // =========================

  const Nav = () => (
    <nav>
      <strong>🛡 Crime Reporting System</strong>

      {user?.role === 'citizen' && (
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
          Admin Dashboard
        </button>
      )}

      {user?.role === 'police' && (
        <button onClick={() => setPage('police')}>
          Police Dashboard
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

  // =========================
  // POLICE CASE CARD
  // =========================

  const PoliceCase = ({ c }) => {
    const [note, setNote] = useState('');
    const [resolution, setResolution] = useState('');

    const assignedToMe =
      c.assignedOfficer === user?.email;

    return (
      <article>
        <h2>{c.complaintId}</h2>

        <p>
          <strong>Crime:</strong>{' '}
          {c.crimeType}
        </p>

        <p>
          <strong>Location:</strong>{' '}
          {c.location}
        </p>

        <p>
          <strong>Description:</strong>{' '}
          {c.description}
        </p>

        <p>
          <strong>Status:</strong>{' '}
          {c.status}
        </p>

        <p>
          <strong>Investigation:</strong>{' '}
          {c.investigationStatus ||
            'Not Started'}
        </p>

        <p>
          <strong>Assigned Officer:</strong>{' '}
          {c.assignedOfficer ||
            'Not assigned'}
        </p>

        {!assignedToMe && !c.assignedOfficer && (
          <p>
            This case has not been assigned yet.
          </p>
        )}

        {assignedToMe &&
          c.investigationStatus !==
            'Completed' && (
            <>
              {c.investigationStatus ===
                'Not Started' ||
              c.investigationStatus ===
                'Accepted' ? (
                <button
                  disabled={loading}
                  onClick={() =>
                    acceptCase(c._id)
                  }
                >
                  Accept Case
                </button>
              ) : null}

              <h3>Investigation Update</h3>

              <textarea
                value={note}
                onChange={(e) =>
                  setNote(e.target.value)
                }
                placeholder="Enter investigation findings, actions taken, observations..."
              />

              <button
                disabled={loading}
                onClick={() => {
                  addInvestigation(
                    c._id,
                    note
                  );
                  setNote('');
                }}
              >
                Add Investigation Update
              </button>

              <h3>Case Evidence</h3>

              <input
                type="file"
                onChange={(e) => {
                  const file =
                    e.target.files?.[0];

                  if (file) {
                    uploadEvidence(
                      c._id,
                      file
                    );
                    e.target.value = '';
                  }
                }}
                disabled={loading}
              />

              <p>
                Maximum file size: 10 MB.
              </p>

              <h3>Complete Investigation</h3>

              <textarea
                value={resolution}
                onChange={(e) =>
                  setResolution(
                    e.target.value
                  )
                }
                placeholder="Enter final resolution details..."
              />

              <button
                disabled={loading}
                onClick={() =>
                  completeInvestigation(
                    c._id,
                    resolution
                  )
                }
              >
                Investigation Completed
              </button>
            </>
          )}

        {c.investigationUpdates?.length > 0 && (
          <>
            <h3>Investigation Timeline</h3>

            {c.investigationUpdates.map(
              (update, index) => (
                <div key={index}>
                  <p>
                    <strong>
                      {update.officerEmail}
                    </strong>
                  </p>

                  <p>{update.note}</p>

                  <small>
                    {new Date(
                      update.createdAt
                    ).toLocaleString()}
                  </small>
                </div>
              )
            )}
          </>
        )}

        {c.evidence?.length > 0 && (
          <>
            <h3>Evidence</h3>

            {c.evidence.map(
              (file, index) => (
                <div key={index}>
                  <p>
                    <strong>
                      {file.originalName}
                    </strong>
                  </p>

                  <small>
                    Uploaded by:{' '}
                    {file.uploadedBy}
                    <br />
                    {new Date(
                      file.uploadedAt
                    ).toLocaleString()}
                  </small>

                  <br />

                  <a
                    href={
                      API + file.path
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Evidence
                  </a>
                </div>
              )
            )}
          </>
        )}

        {c.resolutionDetails && (
          <>
            <h3>Resolution</h3>

            <p>
              {c.resolutionDetails}
            </p>
          </>
        )}
      </article>
    );
  };

  let content;

  // =========================
  // REGISTER
  // =========================

  if (page === 'register') {
    content = (
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

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Creating account...'
              : 'Register'}
          </button>
        </form>
      </section>
    );
  }

  // =========================
  // LOGIN
  // =========================

  else if (page === 'login') {
    content = (
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

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Logging in...'
              : 'Login'}
          </button>
        </form>
      </section>
    );
  }

  // =========================
  // REPORT
  // =========================

  else if (
    page === 'report' &&
    user?.role === 'citizen'
  ) {
    content = (
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



          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Submitting...'
              : 'Submit Complaint'}
          </button>
        </form>
      </section>
    );
  }

  // =========================
  // CITIZEN TRACKING
  // =========================

  else if (
    page === 'track' &&
    user?.role === 'citizen'
  ) {
    content = (
      <section>
        <h1>My Complaints</h1>

        {complaints.map((c) => (
          <article key={c._id}>
            <h2>{c.complaintId}</h2>

            <p>
              <strong>Status:</strong>{' '}
              {c.status}
            </p>

            <p>
              <strong>Investigation:</strong>{' '}
              {c.investigationStatus ||
                'Not Started'}
            </p>

            <p>
              <strong>Crime:</strong>{' '}
              {c.crimeType}
            </p>

            <p>
              <strong>Location:</strong>{' '}
              {c.location}
            </p>

            <h3>Case Timeline</h3>

            <p>
              Submitted:{' '}
              {new Date(
                c.createdAt
              ).toLocaleString()}
            </p>

            {c.acceptedAt && (
              <p>
                Accepted:{' '}
                {new Date(
                  c.acceptedAt
                ).toLocaleString()}
              </p>
            )}

            {c.investigationUpdates?.map(
              (update, index) => (
                <div key={index}>
                  <p>
                    <strong>
                      Investigation update
                    </strong>
                  </p>

                  <p>{update.note}</p>

                  <small>
                    {new Date(
                      update.createdAt
                    ).toLocaleString()}
                  </small>
                </div>
              )
            )}

            {c.resolutionDetails && (
              <>
                <h3>Resolution</h3>
                <p>
                  {c.resolutionDetails}
                </p>
              </>
            )}

            {c.evidence?.length > 0 && (
              <>
                <h3>Case Evidence</h3>

                {c.evidence.map(
                  (file, index) => (
                    <div key={index}>
                      <p>
                        {file.originalName}
                      </p>

                      <a
                        href={
                          API + file.path
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Evidence
                      </a>
                    </div>
                  )
                )}
              </>
            )}
          </article>
        ))}

        {!complaints.length && (
          <p>No complaints found.</p>
        )}
      </section>
    );
  }

  // =========================
  // SOS
  // =========================

  else if (page === 'sos') {
    content = (
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
    );
  }

  // =========================
  // POLICE DASHBOARD
  // =========================

  else if (
    page === 'police' &&
    user?.role === 'police'
  ) {
    const assignedCases =
      complaints.filter(
        (c) =>
          c.assignedOfficer ===
          user.email
      );

    content = (
      <>
        <section className="hero">
          <h1>Police Dashboard</h1>

          <p>
            Welcome, {user.name}.
          </p>

          <p>
            Manage your assigned cases,
            investigations and evidence.
          </p>
        </section>

        <section>
          <h2>
            Assigned Cases ({assignedCases.length})
          </h2>

          {assignedCases.map((c) => (
            <PoliceCase
              key={c._id}
              c={c}
            />
          ))}

          {!assignedCases.length && (
            <p>
              No cases are currently assigned
              to you.
            </p>
          )}
        </section>
      </>
    );
  }

  // =========================
  // ADMIN DASHBOARD
  // =========================

  else if (
    page === 'admin' &&
    user?.role === 'admin'
  ) {
    const policeUsers =
      users.filter(
        (u) => u.role === 'police'
      );

    const resolvedCount =
      complaints.filter(
        (c) => c.status === 'Resolved'
      ).length;

    const activeCount =
      complaints.filter(
        (c) => c.status !== 'Resolved'
      ).length;

    content = (
      <>
        <section className="hero">
          <h1>Admin Dashboard</h1>

          <p>
            Manage users, complaints,
            police assignments and SOS alerts.
          </p>
        </section>

        <section>
          <h2>Statistics</h2>

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
            <b>Active SOS</b>
            <h2>{sos.length}</h2>
          </article>
        </section>

        <section>
          <h2>Create Police Account</h2>

          <form onSubmit={createPolice}>
            <input
              name="name"
              placeholder="Officer name"
              required
            />

            <input
              name="email"
              type="email"
              placeholder="Officer email"
              required
            />

            <input
              name="password"
              type="password"
              placeholder="Temporary password"
              required
            />

            <button
              type="submit"
              disabled={loading}
            >
              Create Police Account
            </button>
          </form>
        </section>

        <section>
          <h2>Police Officers</h2>

          {policeUsers.map((officer) => (
            <article key={officer._id}>
              <b>{officer.name}</b>

              <p>{officer.email}</p>

              <small>
                Role: Police
              </small>
            </article>
          ))}

          {!policeUsers.length && (
            <p>
              No police accounts created yet.
            </p>
          )}
        </section>

        <section>
          <h2>All Complaints</h2>

          {complaints.map((c) => (
            <article key={c._id}>
              <h2>{c.complaintId}</h2>

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
                <strong>Status:</strong>{' '}
                {c.status}
              </p>

              <p>
                <strong>Investigation:</strong>{' '}
                {c.investigationStatus ||
                  'Not Started'}
              </p>

              <p>
                <strong>Assigned Officer:</strong>{' '}
                {c.assignedOfficer ||
                  'Not assigned'}
              </p>

              <select
                disabled={loading}
                defaultValue=""
                onChange={(e) =>
                  assignOfficer(
                    c._id,
                    e.target.value
                  )
                }
              >
                <option value="">
                  Assign Police Officer
                </option>

                {policeUsers.map(
                  (officer) => (
                    <option
                      key={officer._id}
                      value={officer.email}
                    >
                      {officer.name} —{' '}
                      {officer.email}
                    </option>
                  )
                )}
              </select>

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
                <option value="Submitted">
                  Submitted
                </option>

                <option value="Under Review">
                  Under Review
                </option>

                <option value="In Progress">
                  In Progress
                </option>

                <option value="Resolved">
                  Resolved
                </option>
              </select>

              {c.investigationUpdates?.length >
                0 && (
                <>
                  <h3>
                    Investigation Updates
                  </h3>

                  {c.investigationUpdates.map(
                    (update, index) => (
                      <div key={index}>
                        <p>
                          <strong>
                            {update.officerEmail}
                          </strong>
                        </p>

                        <p>
                          {update.note}
                        </p>

                        <small>
                          {new Date(
                            update.createdAt
                          ).toLocaleString()}
                        </small>
                      </div>
                    )
                  )}
                </>
              )}

              {c.evidence?.length > 0 && (
                <>
                  <h3>Evidence</h3>

                  {c.evidence.map(
                    (file, index) => (
                      <div key={index}>
                        <p>
                          {file.originalName}
                        </p>

                        <a
                          href={
                            API + file.path
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          View Evidence
                        </a>
                      </div>
                    )
                  )}
                </>
              )}

              {c.resolutionDetails && (
                <>
                  <h3>Resolution</h3>
                  <p>
                    {c.resolutionDetails}
                  </p>
                </>
              )}
            </article>
          ))}

          {!complaints.length && (
            <p>No complaints found.</p>
          )}
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
        </section>

        <section>
          <h2>Active SOS Alerts</h2>

          {sos.map((a) => (
            <article key={a._id}>
              <b>🚨 SOS Alert</b>

              <p>
                Location:{' '}
                {a.latitude},{' '}
                {a.longitude}
              </p>

              <small>
                User:{' '}
                {a.userEmail || 'Unknown'}
                <br />
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
      </>
    );
  }

  // =========================
  // HOME
  // =========================

  else {
    content = (
      <section className="hero">
        <h1>
          Report. Track. Respond.
        </h1>

        <p>
          Digital crime reporting with
          complaint tracking, SOS alerts,
          investigation management and
          evidence handling.
        </p>

        {user?.role === 'citizen' ? (
          <button
            onClick={() =>
              setPage('report')
            }
          >
            File a Complaint
          </button>
        ) : user?.role === 'police' ? (
          <button
            onClick={() =>
              setPage('police')
            }
          >
            Open Police Dashboard
          </button>
        ) : user?.role === 'admin' ? (
          <button
            onClick={() =>
              setPage('admin')
            }
          >
            Open Admin Dashboard
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