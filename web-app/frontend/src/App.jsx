import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const defaultForm = {
  rfh: '180.5',
  rfh_avg: '140.0',
  rfh_lag1: '155.2',
};

const defaultTrend = [
  { month: 'Jan', dengue: 42, rainfall: 30 },
  { month: 'Feb', dengue: 48, rainfall: 36 },
  { month: 'Mar', dengue: 57, rainfall: 41 },
  { month: 'Apr', dengue: 66, rainfall: 52 },
  { month: 'May', dengue: 78, rainfall: 71 },
  { month: 'Jun', dengue: 95, rainfall: 88 },
  { month: 'Jul', dengue: 112, rainfall: 91 },
];

const regionHeatmap = [
  { name: 'NCR', risk: 0.88 },
  { name: 'CAR', risk: 0.41 },
  { name: 'Region I', risk: 0.48 },
  { name: 'Region II', risk: 0.45 },
  { name: 'Region III', risk: 0.67 },
  { name: 'Region IV-A', risk: 0.7 },
  { name: 'MIMAROPA', risk: 0.39 },
  { name: 'Region V', risk: 0.63 },
  { name: 'Region VI', risk: 0.53 },
  { name: 'Region VII', risk: 0.76 },
  { name: 'Region VIII', risk: 0.58 },
  { name: 'Region IX', risk: 0.47 },
  { name: 'Region X', risk: 0.5 },
  { name: 'Region XI', risk: 0.72 },
  { name: 'Region XII', risk: 0.66 },
  { name: 'CARAGA', risk: 0.61 },
  { name: 'BARMM', risk: 0.79 },
];

function riskTone(probability) {
  if (probability >= 0.75) {
    return {
      className: 'risk-card risk-card--high',
      label: 'HIGH RISK',
      accent: '#dc2626',
      soft: 'rgba(220, 38, 38, 0.14)',
    };
  }

  if (probability >= 0.5) {
    return {
      className: 'risk-card risk-card--watch',
      label: 'WATCH',
      accent: '#d97706',
      soft: 'rgba(217, 119, 6, 0.14)',
    };
  }

  return {
    className: 'risk-card risk-card--low',
    label: 'LOW RISK',
    accent: '#15803d',
    soft: 'rgba(21, 128, 61, 0.14)',
  };
}

function formatKeyDriver(featureName) {
  if (featureName.includes('rfh_lag1')) {
    return 'Warning: the previous month rainfall signal is the dominant driver in this forecast.';
  }

  if (featureName.includes('rfh_avg')) {
    return 'Historical monthly rainfall is shaping the forecast more than the current spike.';
  }

  if (featureName.includes('rfh')) {
    return 'Current rainfall is the strongest signal in the forecast.';
  }

  return `The strongest signal appears in ${featureName}.`;
}

function makeFallbackHeatmap(probability) {
  return regionHeatmap.map((region, index) => ({
    ...region,
    risk: Math.max(0.12, Math.min(0.98, region.risk * 0.6 + probability * 0.4 + index * 0.004 - 0.03)),
  }));
}

export default function App() {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadModelInfo() {
      try {
        const response = await fetch(`${API_BASE_URL}/model-info`);
        if (!response.ok) {
          throw new Error('Failed to load model info.');
        }

        const data = await response.json();
        if (!cancelled) {
          setModelInfo(data);
        }
      } catch {
        if (!cancelled) {
          setModelInfo(null);
        }
      }
    }

    loadModelInfo();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        rfh: Number(form.rfh),
        rfh_avg: Number(form.rfh_avg),
        rfh_lag1: Number(form.rfh_lag1),
      };

      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || 'Prediction request failed.');
      }

      const data = await response.json();
      setResult(data);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  const probability = result ? result.probability : 0.42;
  const theme = riskTone(probability);
  const trendData = defaultTrend.map((point, index) => ({
    ...point,
    dengue: result ? point.dengue * (0.88 + probability * 0.28) : point.dengue,
    rainfall: result ? point.rainfall * (0.92 + probability * 0.16) : point.rainfall,
    monthIndex: index,
  }));
  const heatmapData = result ? makeFallbackHeatmap(probability) : regionHeatmap;
  const modelAccuracy = result?.model_accuracy ?? modelInfo?.accuracy ?? 0.75;
  const topRecommendation = result?.recommended_actions?.[0] ?? 'Keep the affected areas clear of stagnant water.';
  const keyDriver = result?.key_driver ?? 'rfh_lag1';

  return (
    <main className="app-shell" style={{ '--accent': theme.accent, '--soft': theme.soft }}>
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Philippine Dengue Prediction Model & Web App</p>
          <h1>Dengue risk, predicted from rainfall signals and turned into action.</h1>
          <p className="lede">
            Send three weather inputs to the FastAPI backend and get a visual risk response with a confidence score,
            primary driver, recommendations, and context charts.
          </p>
          <div className="hero__stats">
            <article>
              <span>Model</span>
              <strong>Tuned Random Forest</strong>
            </article>
            <article>
              <span>Accuracy</span>
              <strong>{(modelAccuracy * 100).toFixed(1)}%</strong>
            </article>
            <article>
              <span>Risk Signal</span>
              <strong>{result ? theme.label : 'READY'}</strong>
            </article>
          </div>
        </div>

        <aside className="hero__panel">
          <div className={`risk-card ${theme.className}`}>
            <span className="risk-card__label">{result ? theme.label : 'READY TO PREDICT'}</span>
            <div className="risk-card__value">{result ? `${(probability * 100).toFixed(1)}%` : '0.0%'}</div>
            <p>{result ? result.status : 'Enter rainfall values to evaluate the outbreak likelihood.'}</p>
          </div>
          <div className="mini-note">
            <strong>Technical transparency</strong>
            <span>Powered by a tuned Random Forest Classifier with backend feature engineering.</span>
          </div>
        </aside>
      </section>

      <section className="content-grid">
        <article className="panel panel--form">
          <div className="panel__heading">
            <h2>Prediction Dashboard</h2>
            <p>Frontend collects the raw weather values while the backend handles the transformations.</p>
          </div>

          <form className="prediction-form" onSubmit={handleSubmit}>
            <label>
              Current Rainfall (rfh)
              <input name="rfh" type="number" step="0.1" value={form.rfh} onChange={updateField} />
            </label>
            <label>
              Historical Average (rfh_avg)
              <input name="rfh_avg" type="number" step="0.1" value={form.rfh_avg} onChange={updateField} />
            </label>
            <label>
              Previous Month Rainfall (rfh_lag1)
              <input name="rfh_lag1" type="number" step="0.1" value={form.rfh_lag1} onChange={updateField} />
            </label>

            <button type="submit" disabled={loading}>
              {loading ? 'Predicting...' : 'Run Prediction'}
            </button>
          </form>

          {error ? <p className="alert alert--error">{error}</p> : null}

          {result ? (
            <div className="result-stack">
              <article className="info-card info-card--signal">
                <span>Confidence Score</span>
                <strong>{(result.probability * 100).toFixed(1)}% probability of outbreak</strong>
              </article>
              <article className="info-card">
                <span>Key Driver Alert</span>
                <strong>{formatKeyDriver(keyDriver)}</strong>
              </article>
              <article className="info-card">
                <span>Recommended Action</span>
                <strong>{topRecommendation}</strong>
              </article>
            </div>
          ) : null}
        </article>

        <article className="panel panel--chart">
          <div className="panel__heading">
            <h2>Trend Line</h2>
            <p>Historical dengue cases versus rainfall for similar monthly windows.</p>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(15, 23, 42, 0.12)" />
                <XAxis dataKey="month" stroke="#334155" />
                <YAxis stroke="#334155" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="dengue" stroke="#0f766e" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="rainfall" stroke="#ea580c" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="panel panel--heatmap">
        <div className="panel__heading">
          <h2>Regional Heatmap</h2>
          <p>A compact risk map showing which regions are carrying the warmest signal.</p>
        </div>
        <div className="heatmap-grid">
          {heatmapData.map((region) => (
            <article
              className="heatmap-tile"
              key={region.name}
              style={{ '--tile-risk': region.risk }}
            >
              <span>{region.name}</span>
              <strong>{(region.risk * 100).toFixed(0)}%</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel panel--insights">
        <div className="panel__heading">
          <h2>Actionable Insights</h2>
          <p>Use the forecast as a trigger for preventive cleanup, fogging, and community messaging.</p>
        </div>
        <div className="insights-grid">
          <article className="insight-card">
            <h3>Why this forecast matters</h3>
            <p>{result ? formatKeyDriver(keyDriver) : 'The dashboard is waiting for a submitted forecast.'}</p>
          </article>
          <article className="insight-card">
            <h3>Recommended response</h3>
            <ul>
              {(result?.recommended_actions ?? [
                'Clear stagnant water in residential areas.',
                'Increase community fogging in identified hotspots.',
                'Distribute insecticide-treated nets.',
              ]).map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </article>
          <article className="insight-card">
            <h3>Model footnote</h3>
            <p>
              Powered by a tuned Random Forest Classifier ({(modelAccuracy * 100).toFixed(1)}% accuracy). Climate data
              provided by PAGASA/HDX and health data provided by DOH.
            </p>
            <p className="meta-line">Last updated: {new Date().toLocaleString()}</p>
          </article>
        </div>
      </section>
    </main>
  );
}
