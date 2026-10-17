import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Papa from 'papaparse';
import resultsCsv from '../Assesment - Sheet1 (1).csv?raw';
import './styles.css';

const NOT_CONSIDERED = /\[not considered\]/i;

function parseAssessment(value) {
  const display = value.trim();

  if (!display || display.toUpperCase() === 'ABSENT' || NOT_CONSIDERED.test(display)) {
    return { display: display || '—', score: 0 };
  }

  const score = Number(display);
  return {
    display,
    score: Number.isFinite(score) ? score : 0,
  };
}

const { data: csvRows, errors: csvErrors } = Papa.parse(resultsCsv, {
  header: true,
  skipEmptyLines: true,
});

if (csvErrors.length) {
  console.error('Could not parse all scoreboard rows:', csvErrors);
}

const students = csvRows.map((row) => {
  const assessment1 = parseAssessment(row.assessment_1);
  const assessment2 = parseAssessment(row.assessment_2);

  return {
    roll: row.roll_number.trim(),
    name: row.full_name.trim(),
    branch: row.department.trim(),
    assessment1: assessment1.score,
    assessment1Display: assessment1.display,
    assessment2: assessment2.score,
    assessment2Display: assessment2.display,
    total: assessment1.score + assessment2.score,
  };
});

const branches = ['All', ...new Set(students.map((student) => student.branch).sort())];

function ranked(branch = 'All') {
  const rows = students
    .filter((student) => branch === 'All' || student.branch === branch)
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.assessment2 - a.assessment2 ||
        a.name.localeCompare(b.name),
    );

  let previousTotal = null;
  let previousRank = 0;

  return rows.map((student, index) => {
    const rank = student.total === previousTotal ? previousRank : index + 1;
    previousTotal = student.total;
    previousRank = rank;
    return { ...student, rank };
  });
}

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
  const [error, setError] = useState(false);
  const rankMessage = student ? getRankMessage(student.rank) : null;

  function submit(event) {
    event.preventDefault();
    const found = ranked().find((row) => row.roll === roll.trim());

    if (found) {
      const departmentResult = ranked(found.branch).find((row) => row.roll === found.roll);
      setStudent({ ...found, departmentRank: departmentResult.rank });
    } else {
      setStudent(null);
    }

    setError(!found);
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
          <button className="primary">View my result</button>
        </form>
        <p className="helper">Enter the complete university roll number.</p>
        {error && <p className="error">We couldn't find that roll number. Check it and try again.</p>}
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

function Leaderboard() {
  const [branch, setBranch] = useState('All');
  const rows = useMemo(() => ranked(branch), [branch]);

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
            onChange={(event) => setBranch(event.target.value)}
          >
            {branches.map((item) => (
              <option key={item} value={item}>
                {item === 'All' ? 'All departments' : item}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="podium">
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
      </section>

      <section className="table-card">
        <div className="table-head">
          <h2>{branch === 'All' ? 'Overall standings' : `${branch} standings`}</h2>
          <span className="count">{rows.length} students</span>
        </div>
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
      </section>
    </main>
  );
}

function App() {
  const [page, setPage] = useState('result');

  return (
    <>
      <SpaceScene />
      <Header page={page} setPage={setPage} />
      {page === 'result' ? <ResultPage /> : <Leaderboard />}
      <footer className="footer">
        made with love by xo
      </footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
