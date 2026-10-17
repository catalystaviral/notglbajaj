import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  loadDepartments,
  loadLeaderboard,
  loadStudentByRoll,
  PAGE_SIZE,
} from './loadStudents';
import './styles.css';

const NOT_CONSIDERED = /\[not considered\]/i;

function getRankMessage(rank) {
  if (rank <= 150) {
    return {
      tone: 'elite',
      label: 'Top 150 unlocked',
      text: "Congrats! You're one of the top students at GL Bajaj. Now go get a life.",
    };
  }

  if (rank <= 1000) {
    return {
      tone: 'climb',
      label: 'Climbing the ranks',
      text: "You're doing alright—respectable rank, questionable screen time. Lock in and climb higher.",
    };
  }

  return {
    tone: 'comeback',
    label: 'Comeback arc pending',
    text: 'This rank is character development. Close the reels, open the notes, and start the comeback.',
  };
}

function ScoreValue({ value }) {
  const isStatus = value === 'ABSENT' || value === '—' || NOT_CONSIDERED.test(value);
  return <span className={isStatus ? 'score-status' : undefined}>{value}</span>;
}

function SpaceScene() {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrame;

    function updatePointer(event) {
      if (reducedMotion.matches) return;

      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        root.style.setProperty('--pointer-x', x.toFixed(3));
        root.style.setProperty('--pointer-y', y.toFixed(3));
      });
    }

    function resetPointer() {
      root.style.setProperty('--pointer-x', '0');
      root.style.setProperty('--pointer-y', '0');
    }

    window.addEventListener('pointermove', updatePointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', resetPointer);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', updatePointer);
      document.documentElement.removeEventListener('pointerleave', resetPointer);
      resetPointer();
    };
  }, []);

  return (
    <div className="space-scene" aria-hidden="true">
      <div className="planet-track">
        <div className="space-planet">
          <span className="planet-crater crater-one" />
          <span className="planet-crater crater-two" />
        </div>
      </div>
      <div className="orbit-track orbit-one"><span /></div>
      <div className="orbit-track orbit-two"><span /></div>
      <i className="shooting-star star-one" />
      <i className="shooting-star star-two" />
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen" role="status" aria-live="polite">
      <div className="moon-loader" aria-hidden="true">
        <span className="moon-loader-ring" />
        <span className="moon-loader-orbit"><i /></span>
        <span className="moon-loader-body">
          <i className="moon-crater moon-crater-one" />
          <i className="moon-crater moon-crater-two" />
          <i className="moon-crater moon-crater-three" />
        </span>
      </div>
      <span className="loading-label">Connecting to orbit</span>
      <p>Loading student results<span className="loading-dots" aria-hidden="true">...</span></p>
      <span className="loading-credit">made with love by xo</span>
    </main>
  );
}

function Header({ page, setPage }) {
  return (
    <header className="shell nav">
      <button className="brand" onClick={() => setPage('result')}>
        <span className="brand-mark">xo</span>
        <span>Student Scoreboard</span>
      </button>
      <nav className="nav-links">
        <button
          className={`nav-link ${page === 'result' ? 'active' : ''}`}
          onClick={() => setPage('result')}
        >
          My result
        </button>
        <button
          className={`nav-link ${page === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setPage('leaderboard')}
        >
          Leaderboard
        </button>
      </nav>
    </header>
  );
}

function ResultPage() {
  const [roll, setRoll] = useState('');
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const rankMessage = student ? getRankMessage(student.rank) : null;

  async function submit(event) {
    event.preventDefault();
    setSearching(true);
    setError('');

    try {
      const found = await loadStudentByRoll(roll);
      setStudent(found);
      if (!found) setError("We couldn't find that roll number. Check it and try again.");
    } catch (requestError) {
      setStudent(null);
      setError(requestError.message || 'Could not load this result. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Assessment results</span>
        <h1>Your progress,<br />in one clear view.</h1>
        <p>Enter your roll number to see both assessment marks, and where you stand in your college</p>
      </section>

      <section className="lookup-card">
        <form className="lookup-form" onSubmit={submit}>
          <input
            value={roll}
            onChange={(event) => setRoll(event.target.value)}
            placeholder="Enter your roll number"
            required
          />
          <button className="primary" disabled={searching}>
            {searching ? 'Searching…' : 'View my result'}
          </button>
        </form>
        <p className="helper">Enter the complete university roll number.</p>
        {error && <p className="error">{error}</p>}
      </section>

      {student && (
        <section className="result">
          <div className="result-head">
            <div>
              <h2 className="result-name">{student.name}</h2>
              <div className="result-meta">{student.roll} · {student.branch}</div>
            </div>
            <div className="rank-stack">
              <div className="rank-badge department-rank">
                <span>{student.branch} position</span>
                <strong>#{student.departmentRank}</strong>
              </div>
              <div className="rank-badge">
                <span>Overall position</span>
                <strong>#{student.rank}</strong>
              </div>
            </div>
          </div>
          <div className="score-grid">
            <div className="score">
              <span>Assessment 1</span>
              <strong><ScoreValue value={student.assessment1Display} /></strong>
            </div>
            <div className="score">
              <span>Assessment 2</span>
              <strong><ScoreValue value={student.assessment2Display} /></strong>
            </div>
            <div className="score total">
              <span>Combined score</span>
              <strong>{student.total}</strong>
            </div>
          </div>
          <div className={`rank-message ${rankMessage.tone}`}>
            <span>{rankMessage.label}</span>
            <p>{rankMessage.text}</p>
          </div>
        </section>
      )}
    </main>
  );
}

function Leaderboard({ branches }) {
  const [branch, setBranch] = useState('All');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    loadLeaderboard({ branch, page })
      .then((result) => {
        if (!active) return;
        setRows(result.students);
        setTotal(result.total);
      })
      .catch((requestError) => {
        if (!active) return;
        setRows([]);
        setTotal(0);
        setError(requestError.message || 'Could not load the leaderboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [branch, page]);

  function changeBranch(event) {
    setBranch(event.target.value);
    setPage(1);
  }

  return (
    <main className="shell">
      <section className="leader-hero">
        <div>
          <span className="eyebrow">Live standings</span>
          <h1>Leaderboard</h1>
          <p>Rankings use the combined score of both assessments. Absent and not-considered entries count as zero.</p>
        </div>
        <div className="filter-wrap">
          <label htmlFor="branch">Filter by department</label>
          <select
            className="select"
            id="branch"
            value={branch}
            onChange={changeBranch}
          >
            {['All', ...branches].map((item) => (
              <option key={item} value={item}>
                {item === 'All' ? 'All departments' : item}
              </option>
            ))}
          </select>
        </div>
      </section>

      {page === 1 && !loading && !error && <section className="podium">
        {rows.slice(0, 3).map((student, index) => (
          <article
            className={`podium-card ${['first', 'second', 'third'][index]}`}
            key={student.roll}
          >
            <span className="medal">{index + 1}</span>
            <span className="podium-score">{student.total}<small> pts</small></span>
            <h2 className="podium-name">{student.name}</h2>
            <div className="podium-meta">{student.roll} · {student.branch}</div>
          </article>
        ))}
      </section>}

      <section className="table-card">
        <div className="table-head">
          <h2>{branch === 'All' ? 'Overall standings' : `${branch} standings`}</h2>
          <span className="count">
            {total ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}` : '0 students'}
          </span>
        </div>
        {loading && <div className="table-status">Loading this page…</div>}
        {!loading && error && <div className="table-status table-error">{error}</div>}
        {!loading && !error && rows.length === 0 && (
          <div className="table-status">No students found for this department.</div>
        )}
        {!loading && !error && rows.length > 0 && <>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Position</th>
                <th>Student</th>
                <th>Department</th>
                <th>Assessment 1</th>
                <th>Assessment 2</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((student) => (
                <tr key={student.roll}>
                  <td className="position">#{student.rank}</td>
                  <td className="student-cell">
                    <strong>{student.name}</strong>
                    <span>{student.roll}</span>
                  </td>
                  <td><span className="branch-pill">{student.branch}</span></td>
                  <td><ScoreValue value={student.assessment1Display} /></td>
                  <td><ScoreValue value={student.assessment2Display} /></td>
                  <td className="total-cell">{student.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination" aria-label="Leaderboard pages">
          <button onClick={() => setPage(1)} disabled={page === 1}>First 100</button>
          <button onClick={() => setPage((value) => value - 1)} disabled={page === 1}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage((value) => value + 1)} disabled={page === totalPages}>Next</button>
        </div>
        </>}
      </section>
    </main>
  );
}

function App() {
  const [page, setPage] = useState('result');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function connect() {
      try {
        const loadedBranches = await loadDepartments();
        if (active) {
          setBranches(loadedBranches);
          setDataError(null);
        }
      } catch (error) {
        console.error('Could not connect to the scoreboard:', error);
        if (active) {
          setDataError({
            code: error.code || 'unknown',
            message: error.message || 'Could not load the student results.',
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    connect();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const errorTitle = {
    configuration: 'Deployment not configured.',
    setup: 'Database setup required.',
    permission: 'Database access blocked.',
    network: 'Connection lost.',
  }[dataError?.code] || 'Data unavailable.';

  return (
    <>
      <SpaceScene />
      {!loading && <Header page={page} setPage={setPage} />}
      {loading && <LoadingScreen />}
      {!loading && dataError && (
        <main className="shell data-state error-state">
          <span className="eyebrow">Connection error</span>
          <h1>{errorTitle}</h1>
          <p>{dataError.message}</p>
          <button className="retry-button" onClick={() => {
            setLoading(true);
            setReloadKey((value) => value + 1);
          }}>Try again</button>
        </main>
      )}
      {!loading && !dataError && (
        page === 'result'
          ? <ResultPage />
          : <Leaderboard branches={branches} />
      )}
      {!loading && (
        <footer className="footer">
          made with love by xo
        </footer>
      )}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
