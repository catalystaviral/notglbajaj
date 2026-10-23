import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import './styles.css';

function App() {
  return (
    <main className="maintenance-page">
      <section className="maintenance-card" aria-labelledby="page-title">
        <div className="status-mark" aria-hidden="true">
          <span />
        </div>

        <p className="eyebrow">Service notice</p>
        <h1 id="page-title">Temporarily unavailable</h1>
        <p className="message">
          This service is temporarily unavailable.
        </p>  
        <p className="message">
          please contact the owner of this site.
        </p>

        <div className="status-line">
          <span className="status-dot" aria-hidden="true" />
          Made with love by XO
        </div>
      </section>
      <Analytics />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
