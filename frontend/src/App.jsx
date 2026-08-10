import React, { useEffect, useState } from 'react';

const API = 'http://localhost:5000';

export default function App() {
const [page, setPage] = useState('home');

const [user, setUser] = useState(() =>
JSON.parse(localStorage.getItem('crimeUser') || 'null')
);

const [message, setMessage] = useState('');
const [complaints, setComplaints] = useState([]);
const [sos, setSos] = useState([]);

const notify = (text) => {
setMessage(text);
setTimeout(() => setMessage(''), 4000);
};

const logout = () => {
localStorage.removeItem('crimeUser');
setUser(null);
setPage('home');
};

async function register(e) {
e.preventDefault();


const data = Object.fromEntries(new FormData(e.target));

const r = await fetch(API + '/api/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

const d = await r.json();

notify(d.message);

if (r.ok) {
  e.target.reset();
  setPage('login');
}


}

async function login(e) {
e.preventDefault();


const data = Object.fromEntries(new FormData(e.target));

const r = await fetch(API + '/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

const d = await r.json();

if (r.ok) {
  localStorage.setItem('crimeUser', JSON.stringify(d.user));
  setUser(d.user);
  setPage('home');
}

notify(d.message);


}

async function report(e) {
e.preventDefault();


const data = Object.fromEntries(new FormData(e.target));

data.anonymous = data.anonymous === 'on';
data.userEmail = user?.email || null;

const r = await fetch(API + '/api/complaints', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

const d = await r.json();

if (r.ok) {
  notify('Complaint submitted. Tracking ID: ' + d.complaintId);
  e.target.reset();
} else {
  notify(d.message);
}


}

async function loadComplaints() {
const url =
user?.role === 'admin'
? API + '/api/complaints'
: API + '/api/complaints?email=' +
encodeURIComponent(user?.email || '');


const r = await fetch(url);
setComplaints(await r.json());


}

async function updateStatus(id, status) {
const r = await fetch(API + '/api/complaints/' + id, {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ status })
});


if (r.ok) {
  notify('Status updated');
  loadComplaints();
}


}

async function loadSOS() {
const r = await fetch(API + '/api/sos');
setSos(await r.json());
}

function sendSOS() {
if (!navigator.geolocation) {
return notify('Geolocation is not supported');
}


navigator.geolocation.getCurrentPosition(
  async (p) => {
    const r = await fetch(API + '/api/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: user?.email || null,
        latitude: p.coords.latitude,
        longitude: p.coords.longitude
      })
    });

    const d = await r.json();
    notify(d.message);
  },
  () => notify('Location permission denied')
);


}

useEffect(() => {
if (page === 'track' || page === 'admin') {
loadComplaints();
}


if (page === 'admin') {
  loadSOS();
}


}, [page]);

const Nav = () => ( <nav> <h2>🛡 Crime Reporting System</h2>


  <span>
    <button onClick={() => setPage('home')}>Home</button>

    {user && (
      <>
        <button onClick={() => setPage('report')}>Report</button>
        <button onClick={() => setPage('track')}>Track</button>
        <button onClick={() => setPage('sos')}>SOS</button>
      </>
    )}

    {user?.role === 'admin' && (
      <button onClick={() => setPage('admin')}>Dashboard</button>
    )}

    {!user ? (
      <>
        <button onClick={() => setPage('login')}>Login</button>
        <button onClick={() => setPage('register')}>Register</button>
      </>
    ) : (
      <button onClick={logout}>Logout</button>
    )}
  </span>
</nav>


);

let content;

if (page === 'register') {
content = ( <section> <h1>Create Account</h1>


    <form onSubmit={register}>
      <input name="name" placeholder="Full name" required />

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

      <button type="submit">Register</button>
    </form>
  </section>
);


} else if (page === 'login') {
content = ( <section> <h1>Login</h1>


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

      <button type="submit">Login</button>
    </form>
  </section>
);


} else if (page === 'report') {
content = ( <section> <h1>File a Complaint</h1>


    <form onSubmit={report}>
      <select name="crimeType" required>
        <option value="">Select crime type</option>
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
        <input name="anonymous" type="checkbox" />
        Submit anonymously
      </label>

      <button type="submit">Submit Complaint</button>
    </form>
  </section>
);


} else if (page === 'track') {
content = ( <section> <h1>My Complaints</h1>


    {complaints.map((c) => (
      <article key={c._id}>
        <b>{c.complaintId}</b>
        <span> — {c.status}</span>

        <p>
          {c.crimeType} — {c.location}
        </p>

        <small>
          {new Date(c.createdAt).toLocaleString()}
        </small>
      </article>
    ))}

    {!complaints.length && <p>No complaints found.</p>}
  </section>
);


} else if (page === 'sos') {
content = ( <section> <h1>Emergency SOS</h1>


    <p className="warning">
      Academic prototype: this does not contact real police
      or emergency services.
    </p>

    <button className="sos" onClick={sendSOS}>
      SEND SOS
    </button>
  </section>
);


} else if (page === 'admin') {
content = ( <section> <h1>Admin Dashboard</h1>


    <h3>Active SOS Alerts</h3>

    {sos.map((a) => (
      <article key={a._id}>
        📍 {a.latitude}, {a.longitude}
      </article>
    ))}

    <h3>All Complaints</h3>

    {complaints.map((c) => (
      <article key={c._id}>
        <b>{c.complaintId}</b>

        <p>
          {c.crimeType}: {c.description}
        </p>

        <p>
          {c.anonymous
            ? 'Anonymous'
            : c.userEmail || 'Unknown'}
        </p>

        <select
          value={c.status}
          onChange={(e) =>
            updateStatus(c._id, e.target.value)
          }
        >
          <option>Submitted</option>
          <option>Under Review</option>
          <option>In Progress</option>
          <option>Resolved</option>
        </select>
      </article>
    ))}
  </section>
);


} else {
content = ( <section> <h1>Report. Track. Respond.</h1>


    <p>
      Digital crime reporting with anonymous complaints,
      tracking, SOS alerts and an admin dashboard.
    </p>

    {user ? (
      <button onClick={() => setPage('report')}>
        File a Complaint
      </button>
    ) : (
      <button onClick={() => setPage('register')}>
        Get Started
      </button>
    )}
  </section>
);


}

return (
<> <Nav />


  <main>
    {message && (
      <div className="message">
        {message}
      </div>
    )}

    {content}
  </main>
</>


);
}
