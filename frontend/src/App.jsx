import React, { useEffect, useState } from 'react';

const API = 'http://localhost:5000';

const CASE_STATUSES = [
  'Submitted',
  'Under Review',
  'Verified',
  'Officer Assigned',
  'Under Investigation',
  'Investigation Completed',
  'Resolved',
  'Closed'
];

const PRIORITIES = [
  'Low',
  'Medium',
  'High',
  'Critical'
];

export default function App() {
  const [page, setPage] = useState('home');

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('crimeUser') || 'null'
      );
    } catch {
      return null;
    }
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [complaints, setComplaints] = useState([]);
  const [sos, setSos] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedComplaint, setSelectedComplaint] =
    useState(null);

  // Police dashboard state
  const [policeCases, setPoliceCases] = useState([]);
  const [investigationForm, setInvestigationForm] =
    useState({
      notes: '',
      update: '',
      remarks: ''
    });

  const notify = (text) => {
    setMessage(text);

    setTimeout(() => {
      setMessage('');
    }, 4000);
  };

  // ==========================================
  // API REQUEST
  // ==========================================

  async function apiRequest(url, options = {}) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 30000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      const text = await response.text();

      let data;

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {
          message:
            text || 'Invalid server response'
        };
      }

      return {
        response,
        data
      };
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

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = () => {
    localStorage.removeItem('crimeUser');

    setUser(null);
    setPage('home');
    setComplaints([]);
    setSelectedComplaint(null);

    notify('Logged out successfully');
  };

  // ==========================================
  // REGISTER
  // ==========================================

  async function register(e) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    const form = e.target;

    const data = Object.fromEntries(
      new FormData(form)
    );

    try {
      const {
        response,
        data: result
      } = await apiRequest(
        API + '/api/register',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify(data)
        }
      );

      if (response.ok) {
        notify(
          result.message ||
            'Registration successful.'
        );

        form.reset();

        setPage('login');
      } else {
        notify(
          result.message ||
            'Registration failed.'
        );
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // LOGIN
  // ==========================================

  async function login(e) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    const data = Object.fromEntries(
      new FormData(e.target)
    );

    try {
      const {
        response,
        data: result
      } = await apiRequest(
        API + '/api/login',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify(data)
        }
      );

      if (response.ok) {
        const loggedInUser = {
          ...result.user,
          id:
            result.user.id ||
            result.user._id ||
            null
        };

        localStorage.setItem(
          'crimeUser',
          JSON.stringify(loggedInUser)
        );

        setUser(loggedInUser);

        if (loggedInUser.role === 'admin') {
          setPage('admin');
        } else if (
          loggedInUser.role === 'police'
        ) {
          setPage('police');
        } else {
          setPage('home');
        }

        notify(
          result.message ||
            'Login successful.'
        );
      } else {
        notify(
          result.message ||
            'Login failed.'
        );
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // SUBMIT CRIME REPORT
  // ==========================================

  async function report(e) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    const form = e.target;

    const formData =
      new FormData(form);

    const data = {
      userEmail:
        user?.email || null,

      anonymous:
        formData.get('anonymous') === 'on',

      crimeTitle:
        formData.get('crimeTitle'),

      crimeType:
        formData.get('crimeType'),

      description:
        formData.get('description'),

      incidentDate:
        formData.get('incidentDate'),

      incidentTime:
        formData.get('incidentTime'),

      location:
        formData.get('location'),

      priority:
        formData.get('priority') ||
        'Medium',

      victim: {
        name:
          formData.get('victimName') || '',

        age:
          formData.get('victimAge') || '',

        gender:
          formData.get('victimGender') || '',

        contact:
          formData.get('victimContact') || '',

        description:
          formData.get(
            'victimDescription'
          ) || ''
      },

      suspect: {
        name:
          formData.get('suspectName') || '',

        age:
          formData.get('suspectAge') || '',

        gender:
          formData.get(
            'suspectGender'
          ) || '',

        description:
          formData.get(
            'suspectDescription'
          ) || ''
      }
    };

    try {
      const {
        response,
        data: result
      } = await apiRequest(
        API + '/api/complaints',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify(data)
        }
      );

      if (response.ok) {
        notify(
          'Complaint submitted successfully. Complaint ID: ' +
            result.complaintId
        );

        form.reset();

        setSelectedComplaint(result);

        setPage('complaint');
      } else {
        notify(
          result.message ||
            'Unable to submit complaint.'
        );
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // LOAD COMPLAINTS
  // ==========================================

  async function loadComplaints() {
    if (
      !user?.email &&
      user?.role !== 'admin' &&
      user?.role !== 'police'
    ) {
      return;
    }

    let url =
      API + '/api/complaints';

    if (
      user?.role === 'citizen'
    ) {
      url +=
        '?email=' +
        encodeURIComponent(
          user.email
        );
    }

    try {
      const {
        response,
        data
      } = await apiRequest(url);

      if (
        response.ok &&
        Array.isArray(data)
      ) {
        setComplaints(data);
      } else {
        setComplaints([]);

        notify(
          data.message ||
            'Unable to load complaints.'
        );
      }
    } catch (error) {
      notify(error.message);
    }
  }

  // ==========================================
  // LOAD SINGLE COMPLAINT
  // ==========================================

  async function loadComplaint(id) {
    try {
      const {
        response,
        data
      } = await apiRequest(
        API +
          '/api/complaints/' +
          id
      );

      if (response.ok) {
        setSelectedComplaint(data);
        setPage('complaint');
      } else {
        notify(
          data.message ||
            'Unable to load complaint.'
        );
      }
    } catch (error) {
      notify(error.message);
    }
  }

  // ==========================================
  // UPDATE STATUS
  // ==========================================

  async function updateStatus(
    id,
    status
  ) {
    if (loading) return;

    setLoading(true);

    try {
      const {
        response,
        data
      } = await apiRequest(
        API +
          '/api/complaints/' +
          id +
          '/status',
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            status,

            updatedBy:
              user?.name ||
              'Admin'
          })
        }
      );

      if (response.ok) {
        notify(
          'Case status updated.'
        );

        await loadComplaints();
      } else {
        notify(
          data.message ||
            'Unable to update status.'
        );
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // UPDATE PRIORITY
  // ==========================================

  async function updatePriority(
    id,
    priority
  ) {
    if (loading) return;

    setLoading(true);

    try {
      const {
        response,
        data
      } = await apiRequest(
        API +
          '/api/complaints/' +
          id +
          '/priority',
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            priority
          })
        }
      );

      if (response.ok) {
        notify(
          'Priority updated.'
        );

        await loadComplaints();
      } else {
        notify(
          data.message ||
            'Unable to update priority.'
        );
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // LOAD USERS
  // ==========================================

  async function loadUsers() {
    try {
      const {
        response,
        data
      } = await apiRequest(
        API + '/api/users'
      );

      if (
        response.ok &&
        Array.isArray(data)
      ) {
        setUsers(data);
      }
    } catch (error) {
      notify(error.message);
    }
  }

  // ==========================================
  // LOAD SOS
  // ==========================================

  async function loadSOS() {
    try {
      const {
        response,
        data
      } = await apiRequest(
        API + '/api/sos'
      );

      if (
        response.ok &&
        Array.isArray(data)
      ) {
        setSos(data);
      }
    } catch (error) {
      notify(error.message);
    }
  }

  // ==========================================
  // SEND SOS
  // ==========================================

  function sendSOS() {
    if (loading) return;

    if (
      !navigator.geolocation
    ) {
      notify(
        'Geolocation is not supported by this device.'
      );

      return;
    }

    setLoading(true);

    notify(
      'Getting your location...'
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const {
            response,
            data
          } = await apiRequest(
            API + '/api/sos',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body: JSON.stringify({
                userEmail:
                  user?.email ||
                  null,

                latitude:
                  position.coords
                    .latitude,

                longitude:
                  position.coords
                    .longitude
              })
            }
          );

          if (response.ok) {
            notify(
              data.message ||
                'SOS submitted.'
            );
          } else {
            notify(
              data.message ||
                'Unable to send SOS.'
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

        notify(
          'Location permission denied.'
        );
      }
    );
  }


  // ==========================================
  // POLICE CASES
  // ==========================================

  async function loadPoliceCases() {
    if (!user?.id && !user?.email) return;

    try {
      const identifier = user?.id || user?.email;

      const {
        response,
        data
      } = await apiRequest(
        API +
          '/api/officers/' +
          encodeURIComponent(identifier) +
          '/cases'
      );

      if (response.ok && Array.isArray(data)) {
        setPoliceCases(data);
      } else {
        setPoliceCases([]);
        notify(
          data.message ||
            'Unable to load assigned cases.'
        );
      }
    } catch (error) {
      notify(error.message);
    }
  }

  async function updateInvestigation(complaintId) {
    if (loading) return;

    if (
      !investigationForm.notes.trim() &&
      !investigationForm.update.trim() &&
      !investigationForm.remarks.trim()
    ) {
      notify(
        'Enter an investigation note, update or remark.'
      );
      return;
    }

    setLoading(true);

    try {
      const {
        response,
        data
      } = await apiRequest(
        API +
          '/api/complaints/' +
          complaintId +
          '/investigation',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            notes: investigationForm.notes,
            update: investigationForm.update,
            remarks: investigationForm.remarks,
            addedBy:
              user?.name ||
              'Police Officer'
          })
        }
      );

      if (response.ok) {
        notify(
          'Investigation updated successfully.'
        );

        setInvestigationForm({
          notes: '',
          update: '',
          remarks: ''
        });

        await loadPoliceCases();
      } else {
        notify(
          data.message ||
            'Unable to update investigation.'
        );
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function changePoliceStatus(
    complaintId,
    status
  ) {
    if (loading) return;

    setLoading(true);

    try {
      const {
        response,
        data
      } = await apiRequest(
        API +
          '/api/complaints/' +
          complaintId +
          '/status',
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json'
          },
          body: JSON.stringify({
            status,
            updatedBy:
              user?.name ||
              'Police Officer'
          })
        }
      );

      if (response.ok) {
        notify('Case status updated.');
        await loadPoliceCases();
      } else {
        notify(
          data.message ||
            'Unable to update status.'
        );
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function resolveCase(complaintId) {
    const resolution =
      window.prompt(
        'Enter resolution details:'
      );

    if (resolution === null) return;

    if (!resolution.trim()) {
      notify(
        'Resolution details are required.'
      );
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const {
        response,
        data
      } = await apiRequest(
        API +
          '/api/complaints/' +
          complaintId +
          '/resolve',
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json'
          },
          body: JSON.stringify({
            resolutionDetails:
              resolution,
            updatedBy:
              user?.name ||
              'Police Officer'
          })
        }
      );

      if (response.ok) {
        notify(
          'Case resolved successfully.'
        );
        await loadPoliceCases();
      } else {
        notify(
          data.message ||
            'Unable to resolve case.'
        );
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function closeCase(complaintId) {
    const confirmed =
      window.confirm(
        'Are you sure you want to close this case?'
      );

    if (!confirmed) return;
    if (loading) return;

    setLoading(true);

    try {
      const {
        response,
        data
      } = await apiRequest(
        API +
          '/api/complaints/' +
          complaintId +
          '/close',
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json'
          },
          body: JSON.stringify({
            updatedBy:
              user?.name ||
              'Police Officer'
          })
        }
      );

      if (response.ok) {
        notify(
          'Case closed successfully.'
        );
        await loadPoliceCases();
      } else {
        notify(
          data.message ||
            'Unable to close case.'
        );
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // LOAD DATA WHEN PAGE CHANGES
  // ==========================================

  useEffect(() => {
    if (
      page === 'track' ||
      page === 'admin'
    ) {
      loadComplaints();
    }

    if (page === 'police') {
      loadPoliceCases();
    }

    if (page === 'admin') {
      loadSOS();
      loadUsers();
    }
  }, [page]);

  // ==========================================
  // STATUS BADGE
  // ==========================================

  function StatusBadge({
    status
  }) {
    return (
      <span className="status-badge">
        {status}
      </span>
    );
  }

  // ==========================================
  // PRIORITY BADGE
  // ==========================================

  function PriorityBadge({
    priority
  }) {
    return (
      <span className="priority-badge">
        {priority}
      </span>
    );
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  const Nav = () => (
    <nav>
      <strong>
        🛡 Crime Reporting System
      </strong>

      {user && (
        <>
          <button
            onClick={() =>
              setPage('home')
            }
          >
            Home
          </button>

          {user.role ===
            'citizen' && (
            <>
              <button
                onClick={() =>
                  setPage('report')
                }
              >
                Report Crime
              </button>

              <button
                onClick={() =>
                  setPage('track')
                }
              >
                My Complaints
              </button>
            </>
          )}

          {user.role ===
            'police' && (
            <button
              onClick={() =>
                setPage('police')
              }
            >
              Police Dashboard
            </button>
          )}

          {user.role ===
            'admin' && (
            <button
              onClick={() =>
                setPage('admin')
              }
            >
              Admin Dashboard
            </button>
          )}

          <button
            onClick={() =>
              setPage('sos')
            }
          >
            SOS
          </button>
        </>
      )}

      {!user ? (
        <>
          <button
            onClick={() =>
              setPage('login')
            }
          >
            Login
          </button>

          <button
            onClick={() =>
              setPage('register')
            }
          >
            Register
          </button>
        </>
      ) : (
        <button
          onClick={logout}
        >
          Logout
        </button>
      )}
    </nav>
  );

  let content;

  // ==========================================
  // REGISTER
  // ==========================================

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

  // ==========================================
  // LOGIN
  // ==========================================

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

  // ==========================================
  // CITIZEN REPORT FORM
  // ==========================================

  else if (
    page === 'report'
  ) {
    content = (
      <section>
        <h1>Report a Crime</h1>

        <p>
          Provide the details of the
          incident below.
        </p>

        <form onSubmit={report}>

          <h2>
            Crime Information
          </h2>

          <label>
            Crime Title
          </label>

          <input
            name="crimeTitle"
            placeholder="Example: Mobile phone theft"
            required
          />

          <label>
            Crime Category
          </label>

          <select
            name="crimeType"
            required
          >
            <option value="">
              Select crime category
            </option>

            <option>
              Theft
            </option>

            <option>
              Fraud
            </option>

            <option>
              Harassment
            </option>

            <option>
              Violence
            </option>

            <option>
              Cybercrime
            </option>

            <option>
              Robbery
            </option>

            <option>
              Missing Person
            </option>

            <option>
              Property Crime
            </option>

            <option>
              Other
            </option>
          </select>

          <label>
            Crime Description
          </label>

          <textarea
            name="description"
            placeholder="Describe what happened..."
            required
          />

          <h2>
            Incident Information
          </h2>

          <label>
            Incident Date
          </label>

          <input
            name="incidentDate"
            type="date"
            required
          />

          <label>
            Incident Time
          </label>

          <input
            name="incidentTime"
            type="time"
            required
          />

          <label>
            Incident Location
          </label>

          <input
            name="location"
            placeholder="Enter incident location"
            required
          />

          <h2>
            Victim Information
          </h2>

          <input
            name="victimName"
            placeholder="Victim name"
          />

          <input
            name="victimAge"
            placeholder="Victim age"
            type="number"
            min="0"
          />

          <select name="victimGender">
            <option value="">
              Select victim gender
            </option>

            <option>
              Male
            </option>

            <option>
              Female
            </option>

            <option>
              Other
            </option>

            <option>
              Prefer not to say
            </option>
          </select>

          <input
            name="victimContact"
            placeholder="Victim contact number"
          />

          <textarea
            name="victimDescription"
            placeholder="Additional victim information"
          />

          <h2>
            Suspect Information
          </h2>

          <input
            name="suspectName"
            placeholder="Suspect name if known"
          />

          <input
            name="suspectAge"
            placeholder="Suspect age if known"
            type="number"
            min="0"
          />

          <select name="suspectGender">
            <option value="">
              Select suspect gender
            </option>

            <option>
              Male
            </option>

            <option>
              Female
            </option>

            <option>
              Other
            </option>

            <option>
              Unknown
            </option>
          </select>

          <textarea
            name="suspectDescription"
            placeholder="Suspect description, appearance or other information"
          />

          <h2>
            Case Priority
          </h2>

          <select
            name="priority"
            defaultValue="Medium"
          >
            {PRIORITIES.map(
              (priority) => (
                <option
                  key={priority}
                >
                  {priority}
                </option>
              )
            )}
          </select>

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
    );
  }

  // ==========================================
  // MY COMPLAINTS
  // ==========================================

  else if (
    page === 'track'
  ) {
    content = (
      <section>
        <h1>
          My Complaints
        </h1>

        {complaints.map(
          (c) => (
            <article
              key={c._id}
            >
              <div>
                <strong>
                  {c.complaintId}
                </strong>

                <StatusBadge
                  status={
                    c.status
                  }
                />

                <PriorityBadge
                  priority={
                    c.priority
                  }
                />
              </div>

              <h2>
                {c.crimeTitle ||
                  c.crimeType}
              </h2>

              <p>
                <strong>
                  Category:
                </strong>{' '}
                {c.crimeType}
              </p>

              <p>
                <strong>
                  Location:
                </strong>{' '}
                {c.location}
              </p>

              <p>
                <strong>
                  Submitted:
                </strong>{' '}
                {new Date(
                  c.createdAt
                ).toLocaleString()}
              </p>

              {c.assignedOfficer && (
                <p>
                  <strong>
                    Assigned Officer:
                  </strong>{' '}
                  {
                    c.assignedOfficer
                      .name
                  }
                </p>
              )}

              <button
                onClick={() =>
                  loadComplaint(
                    c._id
                  )
                }
              >
                View Case
              </button>
            </article>
          )
        )}

        {!complaints.length && (
          <article>
            <h2>
              No complaints found
            </h2>

            <p>
              You have not submitted
              any complaints yet.
            </p>

            <button
              onClick={() =>
                setPage('report')
              }
            >
              Report a Crime
            </button>
          </article>
        )}
      </section>
    );
  }

  // ==========================================
  // COMPLAINT DETAILS
  // ==========================================

  else if (
    page === 'complaint'
  ) {
    const c =
      selectedComplaint;

    content = (
      <section>
        {!c ? (
          <article>
            <p>
              No complaint selected.
            </p>
          </article>
        ) : (
          <>
            <article>
              <h1>
                Case Details
              </h1>

              <h2>
                {c.complaintId}
              </h2>

              <StatusBadge
                status={c.status}
              />

              <PriorityBadge
                priority={
                  c.priority
                }
              />

              <h2>
                {c.crimeTitle ||
                  c.crimeType}
              </h2>

              <p>
                <strong>
                  Category:
                </strong>{' '}
                {c.crimeType}
              </p>

              <p>
                <strong>
                  Description:
                </strong>{' '}
                {c.description}
              </p>

              <p>
                <strong>
                  Incident Date:
                </strong>{' '}
                {c.incidentDate
                  ? new Date(
                      c.incidentDate
                    ).toLocaleDateString()
                  : 'Not provided'}
              </p>

              <p>
                <strong>
                  Incident Time:
                </strong>{' '}
                {c.incidentTime ||
                  'Not provided'}
              </p>

              <p>
                <strong>
                  Location:
                </strong>{' '}
                {c.location}
              </p>

              <p>
                <strong>
                  Assigned Officer:
                </strong>{' '}
                {c.assignedOfficer
                  ?.name ||
                  c.assignedOfficerName ||
                  'Not assigned yet'}
              </p>
            </article>

            <article>
              <h2>
                Victim Information
              </h2>

              <p>
                <strong>
                  Name:
                </strong>{' '}
                {c.victim?.name ||
                  'Not provided'}
              </p>

              <p>
                <strong>
                  Age:
                </strong>{' '}
                {c.victim?.age ||
                  'Not provided'}
              </p>

              <p>
                <strong>
                  Gender:
                </strong>{' '}
                {c.victim?.gender ||
                  'Not provided'}
              </p>

              <p>
                <strong>
                  Contact:
                </strong>{' '}
                {c.victim?.contact ||
                  'Not provided'}
              </p>

              <p>
                {c.victim
                  ?.description ||
                  'No additional information.'}
              </p>
            </article>

            <article>
              <h2>
                Suspect Information
              </h2>

              <p>
                <strong>
                  Name:
                </strong>{' '}
                {c.suspect?.name ||
                  'Unknown'}
              </p>

              <p>
                <strong>
                  Age:
                </strong>{' '}
                {c.suspect?.age ||
                  'Unknown'}
              </p>

              <p>
                <strong>
                  Gender:
                </strong>{' '}
                {c.suspect?.gender ||
                  'Unknown'}
              </p>

              <p>
                {
                  c.suspect
                    ?.description ||
                  'No additional information.'
                }
              </p>
            </article>

            <article>
              <h2>
                Case Timeline
              </h2>

              {c.timeline &&
              c.timeline.length ? (
                c.timeline.map(
                  (
                    event,
                    index
                  ) => (
                    <div
                      key={
                        index
                      }
                    >
                      <strong>
                        {new Date(
                          event.date
                        ).toLocaleDateString()}
                      </strong>

                      <p>
                        <StatusBadge
                          status={
                            event.status
                          }
                        />
                      </p>

                      <p>
                        {
                          event.description
                        }
                      </p>

                      <small>
                        Updated by:{' '}
                        {
                          event.updatedBy
                        }
                      </small>

                      <hr />
                    </div>
                  )
                )
              ) : (
                <p>
                  No timeline
                  information yet.
                </p>
              )}
            </article>

            <article>
              <h2>
                Investigation
              </h2>

              <p>
                <strong>
                  Investigation Notes:
                </strong>
              </p>

              <p>
                {c.investigationNotes ||
                  'No investigation notes yet.'}
              </p>

              {c.investigationUpdates &&
                c.investigationUpdates
                  .length > 0 && (
                  <>
                    <h3>
                      Investigation Updates
                    </h3>

                    {c.investigationUpdates.map(
                      (
                        update,
                        index
                      ) => (
                        <div
                          key={
                            index
                          }
                        >
                          <p>
                            {
                              update.update
                            }
                          </p>

                          <small>
                            {
                              update.addedBy
                            }{' '}
                            —{' '}
                            {new Date(
                              update.date
                            ).toLocaleString()}
                          </small>
                        </div>
                      )
                    )}
                  </>
                )}
            </article>

            {c.resolutionDetails && (
              <article>
                <h2>
                  Resolution
                </h2>

                <p>
                  {
                    c.resolutionDetails
                  }
                </p>
              </article>
            )}

            <button
              onClick={() =>
                setPage(
                  user?.role ===
                    'citizen'
                    ? 'track'
                    : 'admin'
                )
              }
            >
              Back
            </button>
          </>
        )}
      </section>
    );
  }

  // ==========================================
  // SOS
  // ==========================================

  else if (
    page === 'sos'
  ) {
    content = (
      <section>
        <h1>
          Emergency SOS
        </h1>

        <p className="warning">
          Academic prototype:
          this does not contact
          real police or emergency
          services.
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

  // ==========================================
  // POLICE DASHBOARD
  // ==========================================

  // ==========================================
  // POLICE DASHBOARD
  // ==========================================

  else if (page === 'police') {
    content = (
      <section>

        {/* ============================
            POLICE HEADER
        ============================= */}

        <section className="hero">
          <h1>
            Police Officer Dashboard
          </h1>

          <p>
            Manage assigned investigations,
            update case progress and record
            investigation information.
          </p>
        </section>

        {/* ============================
            OFFICER PROFILE
        ============================= */}

        <article>
          <h2>
            Officer Profile
          </h2>

          <p>
            <strong>
              Name:
            </strong>{' '}
            {user?.name}
          </p>

          <p>
            <strong>
              Email:
            </strong>{' '}
            {user?.email}
          </p>

          <p>
            <strong>
              Officer ID:
            </strong>{' '}
            {user?.officerId ||
              'Not assigned'}
          </p>

          <p>
            <strong>
              Department:
            </strong>{' '}
            {user?.department ||
              'Not specified'}
          </p>

          <p>
            <strong>
              Badge Number:
            </strong>{' '}
            {user?.badgeNumber ||
              'Not specified'}
          </p>
        </article>

        {/* ============================
            STATISTICS
        ============================= */}

        <section>
          <article>
            <b>
              Total Assigned
            </b>

            <h2>
              {policeCases.length}
            </h2>
          </article>

          <article>
            <b>
              Active Investigations
            </b>

            <h2>
              {activeCases.length}
            </h2>
          </article>

          <article>
            <b>
              Resolved
            </b>

            <h2>
              {resolvedCases.length}
            </h2>
          </article>

          <article>
            <b>
              Closed
            </b>

            <h2>
              {closedCases.length}
            </h2>
          </article>
        </section>

        {/* ============================
            ASSIGNED CASES
        ============================= */}

        <section>
          <h2>
            Assigned Cases
          </h2>

          {!policeCases.length && (
            <article>
              <h3>
                No cases assigned
              </h3>

              <p>
                Cases assigned to you by the
                administrator will appear here.
              </p>
            </article>
          )}

          {policeCases.map(
            (c) => (
              <article
                key={c._id}
              >

                {/* CASE HEADER */}

                <h2>
                  {c.complaintId}
                </h2>

                <StatusBadge
                  status={
                    c.status
                  }
                />

                <PriorityBadge
                  priority={
                    c.priority
                  }
                />

                <h3>
                  {c.crimeTitle ||
                    c.crimeType}
                </h3>

                {/* CASE INFORMATION */}

                <p>
                  <strong>
                    Crime Category:
                  </strong>{' '}
                  {c.crimeType}
                </p>

                <p>
                  <strong>
                    Description:
                  </strong>{' '}
                  {c.description}
                </p>

                <p>
                  <strong>
                    Incident Date:
                  </strong>{' '}
                  {c.incidentDate
                    ? new Date(
                        c.incidentDate
                      ).toLocaleDateString()
                    : 'Not provided'}
                </p>

                <p>
                  <strong>
                    Incident Time:
                  </strong>{' '}
                  {c.incidentTime ||
                    'Not provided'}
                </p>

                <p>
                  <strong>
                    Location:
                  </strong>{' '}
                  {c.location}
                </p>

                <p>
                  <strong>
                    Complainant:
                  </strong>{' '}
                  {c.anonymous
                    ? 'Anonymous'
                    : c.userEmail ||
                      'Unknown'}
                </p>

                {/* ============================
                    VICTIM
                ============================= */}

                <h3>
                  Victim Information
                </h3>

                <p>
                  <strong>
                    Name:
                  </strong>{' '}
                  {c.victim?.name ||
                    'Not provided'}
                </p>

                <p>
                  <strong>
                    Age:
                  </strong>{' '}
                  {c.victim?.age ||
                    'Not provided'}
                </p>

                <p>
                  <strong>
                    Gender:
                  </strong>{' '}
                  {c.victim?.gender ||
                    'Not provided'}
                </p>

                <p>
                  <strong>
                    Contact:
                  </strong>{' '}
                  {c.victim?.contact ||
                    'Not provided'}
                </p>

                {/* ============================
                    SUSPECT
                ============================= */}

                <h3>
                  Suspect Information
                </h3>

                <p>
                  <strong>
                    Name:
                  </strong>{' '}
                  {c.suspect?.name ||
                    'Unknown'}
                </p>

                <p>
                  <strong>
                    Age:
                  </strong>{' '}
                  {c.suspect?.age ||
                    'Unknown'}
                </p>

                <p>
                  <strong>
                    Gender:
                  </strong>{' '}
                  {c.suspect?.gender ||
                    'Unknown'}
                </p>

                <p>
                  <strong>
                    Description:
                  </strong>{' '}
                  {c.suspect
                    ?.description ||
                    'No information provided.'}
                </p>

                {/* ============================
                    STATUS
                ============================= */}

                <h3>
                  Case Status
                </h3>

                <select
                  value={
                    c.status
                  }
                  disabled={
                    loading ||
                    c.status ===
                      'Closed'
                  }
                  onChange={(e) =>
                    changePoliceStatus(
                      c._id,
                      e.target
                        .value
                    )
                  }
                >
                  {CASE_STATUSES.map(
                    (status) => (
                      <option
                        key={
                          status
                        }
                      >
                        {status}
                      </option>
                    )
                  )}
                </select>

                {/* ============================
                    INVESTIGATION FORM
                ============================= */}

                {![
                  'Resolved',
                  'Closed'
                ].includes(
                  c.status
                ) && (
                  <div>

                    <h3>
                      Investigation
                    </h3>

                    <textarea
                      placeholder="Investigation notes"
                      value={
                        investigationForm.notes
                      }
                      onChange={(e) =>
                        setInvestigationForm(
                          {
                            ...investigationForm,
                            notes:
                              e.target
                                .value
                          }
                        )
                      }
                    />

                    <textarea
                      placeholder="Add an investigation update"
                      value={
                        investigationForm.update
                      }
                      onChange={(e) =>
                        setInvestigationForm(
                          {
                            ...investigationForm,
                            update:
                              e.target
                                .value
                          }
                        )
                      }
                    />

                    <textarea
                      placeholder="Case remarks"
                      value={
                        investigationForm.remarks
                      }
                      onChange={(e) =>
                        setInvestigationForm(
                          {
                            ...investigationForm,
                            remarks:
                              e.target
                                .value
                          }
                        )
                      }
                    />

                    <button
                      disabled={
                        loading
                      }
                      onClick={() =>
                        updateInvestigation(
                          c._id
                        )
                      }
                    >
                      {loading
                        ? 'Saving...'
                        : 'Save Investigation Update'}
                    </button>

                  </div>
                )}

                {/* ============================
                    CURRENT NOTES
                ============================= */}

                <h3>
                  Investigation Notes
                </h3>

                <p>
                  {c.investigationNotes ||
                    'No investigation notes yet.'}
                </p>

                {/* ============================
                    INVESTIGATION HISTORY
                ============================= */}

                {c.investigationUpdates &&
                  c.investigationUpdates
                    .length > 0 && (
                    <div>

                      <h3>
                        Investigation Updates
                      </h3>

                      {c.investigationUpdates.map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            key={
                              index
                            }
                          >
                            <p>
                              {
                                item.update
                              }
                            </p>

                            <small>
                              Updated by:{' '}
                              {
                                item.addedBy
                              }
                              <br />

                              {new Date(
                                item.date
                              ).toLocaleString()}
                            </small>

                            <hr />
                          </div>
                        )
                      )}

                    </div>
                  )}

                {/* ============================
                    REMARKS
                ============================= */}

                <h3>
                  Case Remarks
                </h3>

                <p>
                  {c.remarks ||
                    'No remarks yet.'}
                </p>

                {/* ============================
                    TIMELINE
                ============================= */}

                <h3>
                  Case Timeline
                </h3>

                {c.timeline &&
                c.timeline.length > 0 ? (
                  c.timeline.map(
                    (
                      event,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                      >
                        <strong>
                          {new Date(
                            event.date
                          ).toLocaleString()}
                        </strong>

                        <p>
                          <StatusBadge
                            status={
                              event.status
                            }
                          />
                        </p>

                        <p>
                          {
                            event.description
                          }
                        </p>

                        <small>
                          Updated by:{' '}
                          {
                            event.updatedBy
                          }
                        </small>

                        <hr />
                      </div>
                    )
                  )
                ) : (
                  <p>
                    No timeline information.
                  </p>
                )}

                {/* ============================
                    RESOLUTION
                ============================= */}

                {c.resolutionDetails && (
                  <div>
                    <h3>
                      Resolution Details
                    </h3>

                    <p>
                      {
                        c.resolutionDetails
                      }
                    </p>
                  </div>
                )}

                {/* ============================
                    ACTIONS
                ============================= */}

                <div>

                  {![
                    'Resolved',
                    'Closed'
                  ].includes(
                    c.status
                  ) && (
                    <button
                      disabled={
                        loading
                      }
                      onClick={() =>
                        resolveCase(
                          c._id
                        )
                      }
                    >
                      Mark Case Resolved
                    </button>
                  )}

                  {c.status ===
                    'Resolved' && (
                    <button
                      disabled={
                        loading
                      }
                      onClick={() =>
                        closeCase(
                          c._id
                        )
                      }
                    >
                      Close Case
                    </button>
                  )}

                </div>

              </article>
            )
          )}
        </section>
      </section>
    );
  }

  // ==========================================
  // ADMIN DASHBOARD
  // ==========================================

  else if (
    page === 'admin'
  ) {
    const resolvedCount =
      complaints.filter(
        (c) =>
          c.status ===
          'Resolved'
      ).length;

    const closedCount =
      complaints.filter(
        (c) =>
          c.status ===
          'Closed'
      ).length;

    const activeCount =
      complaints.filter(
        (c) =>
          ![
            'Resolved',
            'Closed'
          ].includes(
            c.status
          )
      ).length;

    const highPriorityCount =
      complaints.filter(
        (c) =>
          [
            'High',
            'Critical'
          ].includes(
            c.priority
          )
      ).length;

    content = (
      <section>
        <div className="hero">
          <h1>
            Admin Dashboard
          </h1>

          <p>
            Manage complaints,
            users and cases.
          </p>
        </div>

        <section>
          <article>
            <b>
              Total Users
            </b>

            <h2>
              {users.length}
            </h2>
          </article>

          <article>
            <b>
              Total Complaints
            </b>

            <h2>
              {complaints.length}
            </h2>
          </article>

          <article>
            <b>
              Active Cases
            </b>

            <h2>
              {activeCount}
            </h2>
          </article>

          <article>
            <b>
              Resolved
            </b>

            <h2>
              {resolvedCount}
            </h2>
          </article>

          <article>
            <b>
              Closed
            </b>

            <h2>
              {closedCount}
            </h2>
          </article>

          <article>
            <b>
              High Priority
            </b>

            <h2>
              {highPriorityCount}
            </h2>
          </article>
        </section>

        <article>
          <h2>
            All Complaints
          </h2>

          {complaints.map(
            (c) => (
              <div
                key={c._id}
              >
                <h3>
                  {c.complaintId}
                </h3>

                <StatusBadge
                  status={
                    c.status
                  }
                />

                <PriorityBadge
                  priority={
                    c.priority
                  }
                />

                <p>
                  <strong>
                    Crime:
                  </strong>{' '}
                  {c.crimeTitle ||
                    c.crimeType}
                </p>

                <p>
                  <strong>
                    Location:
                  </strong>{' '}
                  {c.location}
                </p>

                <p>
                  <strong>
                    Complainant:
                  </strong>{' '}
                  {c.anonymous
                    ? 'Anonymous'
                    : c.userEmail ||
                      'Unknown'}
                </p>

                <select
                  value={
                    c.status
                  }
                  disabled={
                    loading
                  }
                  onChange={(e) =>
                    updateStatus(
                      c._id,
                      e.target
                        .value
                    )
                  }
                >
                  {CASE_STATUSES.map(
                    (
                      status
                    ) => (
                      <option
                        key={
                          status
                        }
                      >
                        {status}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={
                    c.priority ||
                    'Medium'
                  }
                  disabled={
                    loading
                  }
                  onChange={(e) =>
                    updatePriority(
                      c._id,
                      e.target
                        .value
                    )
                  }
                >
                  {PRIORITIES.map(
                    (
                      priority
                    ) => (
                      <option
                        key={
                          priority
                        }
                      >
                        {priority}
                      </option>
                    )
                  )}
                </select>

                <br />
                <br />

                <button
                  onClick={() =>
                    loadComplaint(
                      c._id
                    )
                  }
                >
                  View Complete Case
                </button>
              </div>
            )
          )}

          {!complaints.length && (
            <p>
              No complaints found.
            </p>
          )}
        </article>

        <article>
          <h2>
            Registered Users
          </h2>

          {users.map(
            (u) => (
              <div
                key={u._id}
              >
                <strong>
                  {u.name}
                </strong>

                <p>
                  {u.email}
                </p>

                <p>
                  Role:{' '}
                  {u.role}
                </p>

                {u.role ===
                  'police' && (
                  <p>
                    Officer ID:{' '}
                    {u.officerId ||
                      'Not assigned'}
                  </p>
                )}

                <hr />
              </div>
            )
          )}
        </article>

        <article>
          <h2>
            Active SOS Alerts
          </h2>

          {sos.map(
            (alert) => (
              <div
                key={
                  alert._id
                }
              >
                <strong>
                  🚨 SOS Alert
                </strong>

                <p>
                  Location:{' '}
                  {
                    alert.latitude
                  }
                  ,{' '}
                  {
                    alert.longitude
                  }
                </p>

                <p>
                  User:{' '}
                  {alert.userEmail ||
                    'Unknown'}
                </p>

                <small>
                  {new Date(
                    alert.createdAt
                  ).toLocaleString()}
                </small>

                <hr />
              </div>
            )
          )}

          {!sos.length && (
            <p>
              No active SOS
              alerts.
            </p>
          )}
        </article>
      </section>
    );
  }

  // ==========================================
  // HOME
  // ==========================================

  else {
    content = (
      <>
        <section className="hero">
          <h1>
            Report. Track. Respond.
          </h1>

          <p>
            Digital crime reporting
            with complaint tracking,
            investigation progress
            and case management.
          </p>

          <div className="home-actions">
            {user ? (
              <>
                {user.role ===
                  'citizen' && (
                  <button
                    onClick={() =>
                      setPage('report')
                    }
                  >
                    File a Complaint
                  </button>
                )}

                {user.role ===
                  'police' && (
                  <button
                    onClick={() =>
                      setPage('police')
                    }
                  >
                    Open Police Dashboard
                  </button>
                )}

                {user.role ===
                  'admin' && (
                  <button
                    onClick={() =>
                      setPage('admin')
                    }
                  >
                    Open Admin Dashboard
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() =>
                  setPage('register')
                }
              >
                Get Started
              </button>
            )}

            <button
              onClick={() =>
                setPage('login')
              }
            >
              Login
            </button>

            <button
              onClick={() =>
                setPage('register')
              }
            >
              Sign Up
            </button>

            <button
              onClick={() =>
                setPage('report')
              }
            >
              Report Anonymously
            </button>

            <button
              onClick={() =>
                setPage('track')
              }
            >
              Track Complaint
            </button>
          </div>
        </section>

        <section>
          <article>
            <h2>
              Report a Crime
            </h2>

            <p>
              Submit detailed
              information about an
              incident and receive a
              unique Complaint ID.
            </p>
          </article>

          <article>
            <h2>
              Track Your Case
            </h2>

            <p>
              Follow the status and
              timeline of your
              complaint.
            </p>
          </article>

          <article>
            <h2>
              Investigation Tracking
            </h2>

            <p>
              View assigned officer
              and investigation
              progress.
            </p>
          </article>
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

      <main>
        {content}
      </main>
    </>
  );
}