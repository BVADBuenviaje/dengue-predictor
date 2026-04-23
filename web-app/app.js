const { useEffect, useRef, useState } = React;
const API_BASE = "http://127.0.0.1:5000";
const REGION_GEOJSON_SOURCES = [
  { region: "Region I", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-100000000.0.001.json" },
  { region: "Region II", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-200000000.0.001.json" },
  { region: "Region III", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-300000000.0.001.json" },
  { region: "Region IV-A", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-400000000.0.001.json" },
  { region: "Region V", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-500000000.0.001.json" },
  { region: "Region VI", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-600000000.0.001.json" },
  { region: "Region VII", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-700000000.0.001.json" },
  { region: "Region VIII", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-800000000.0.001.json" },
  { region: "Region IX", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-900000000.0.001.json" },
  { region: "Region X", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-1000000000.0.001.json" },
  { region: "Region XI", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-1100000000.0.001.json" },
  { region: "Region XII", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-1200000000.0.001.json" },
  { region: "NCR", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-1300000000.0.001.json" },
  { region: "CAR", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-1400000000.0.001.json" },
  { region: "Region XIII", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-1600000000.0.001.json" },
  { region: "Region IV-B", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-1700000000.0.001.json" },
  { region: "BARMM", url: "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres/provdists-region-1900000000.0.001.json" },
];

const MONTHS = [
  { value: 1, label: "1 - January" },
  { value: 2, label: "2 - February" },
  { value: 3, label: "3 - March" },
  { value: 4, label: "4 - April" },
  { value: 5, label: "5 - May" },
  { value: 6, label: "6 - June" },
  { value: 7, label: "7 - July" },
  { value: 8, label: "8 - August" },
  { value: 9, label: "9 - September" },
  { value: 10, label: "10 - October" },
  { value: 11, label: "11 - November" },
  { value: 12, label: "12 - December" },
];

function FeatureChart({ topFeatures }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return undefined;
    }

    const labels = topFeatures.map((f) => f.name);
    const values = topFeatures.map((f) => Number((f.importance * 100).toFixed(2)));

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Importance (%)",
            data: values,
            backgroundColor: "#0f62fe",
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        scales: { x: { beginAtZero: true } },
        plugins: { legend: { display: false } },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [topFeatures]);

  return <canvas ref={canvasRef}></canvas>;
}

function getProbabilityColor(probability) {
  if (probability == null || Number.isNaN(probability)) {
    return "#D1D5DB";
  }
  if (probability < 0.25) return "#16a34a";
  if (probability < 0.4) return "#65a30d";
  if (probability < 0.55) return "#eab308";
  if (probability < 0.7) return "#f97316";
  return "#dc2626";
}

function RegionRiskMap({ regionRisks }) {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const geoLayerRefs = useRef([]);
  const regionRiskMap = useRef({});

  useEffect(() => {
    const lookup = {};
    regionRisks.forEach((entry) => {
      lookup[entry.region] = entry;
    });
    regionRiskMap.current = lookup;
  }, [regionRisks]);

  useEffect(() => {
    if (!mapContainerRef.current || leafletMapRef.current) {
      return undefined;
    }

    const map = L.map(mapContainerRef.current, {
      center: [12.8797, 121.774],
      zoom: 5,
      minZoom: 4,
      maxZoom: 9,
    });
    leafletMapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    Promise.all(REGION_GEOJSON_SOURCES.map((item) => fetch(item.url).then((res) => res.json())))
      .then((collections) => {
        collections.forEach((geojson, index) => {
          const regionName = REGION_GEOJSON_SOURCES[index].region;
          const layer = L.geoJSON(geojson, {
            style: () => {
              const match = regionRiskMap.current[regionName];
              const probability = match ? Number(match.probability) : null;
              return {
                fillColor: getProbabilityColor(probability),
                fillOpacity: 0.75,
                color: "#334155",
                weight: 1,
              };
            },
            onEachFeature: (feature, featureLayer) => {
              const provinceName = feature?.properties?.adm2_en || "Province";
              const match = regionRiskMap.current[regionName];
              const probability = match ? `${(match.probability * 100).toFixed(2)}%` : "No data";
              const risk = match ? String(match.risk_level).toUpperCase() : "N/A";
              featureLayer.bindTooltip(
                `<strong>${regionName}</strong><br/>${provinceName}<br/>Probability: ${probability}<br/>Risk: ${risk}`
              );
            },
          }).addTo(map);
          geoLayerRefs.current.push({ region: regionName, layer });
        });
      })
      .catch(() => {});

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      geoLayerRefs.current = [];
    };
  }, []);

  useEffect(() => {
    geoLayerRefs.current.forEach(({ region, layer }) => {
      const match = regionRiskMap.current[region];
      layer.eachLayer((featureLayer) => {
        const feature = featureLayer.feature || {};
        const provinceName = feature?.properties?.adm2_en || "Province";
        const probability = match ? Number(match.probability) : null;
        featureLayer.setStyle({
          fillColor: getProbabilityColor(probability),
          fillOpacity: 0.75,
          color: "#334155",
          weight: 1,
        });

        const probabilityText = match ? `${(match.probability * 100).toFixed(2)}%` : "No data";
        const risk = match ? String(match.risk_level).toUpperCase() : "N/A";
        featureLayer.bindTooltip(
          `<strong>${region}</strong><br/>${provinceName}<br/>Probability: ${probabilityText}<br/>Risk: ${risk}`
        );
      });
    });
  }, [regionRisks]);

  return <div ref={mapContainerRef} className="leaflet-map"></div>;
}

function App() {
  const [regions, setRegions] = useState([]);
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [allRegionResults, setAllRegionResults] = useState([]);
  const [formData, setFormData] = useState({
    region: "",
    month: 1,
    year: 2026,
    rfh: "",
    rfh_avg: "",
  });

  useEffect(() => {
    async function loadRegions() {
      setStatus("Loading regions...");
      setIsError(false);
      try {
        const res = await fetch(`${API_BASE}/regions`);
        if (!res.ok) {
          throw new Error("Failed to load regions.");
        }
        const data = await res.json();
        setRegions(data.regions || []);
        setFormData((prev) => ({ ...prev, region: (data.regions || [])[0] || "" }));
        setStatus("");
      } catch (err) {
        setStatus(err.message || "Failed to load regions.");
        setIsError(true);
      }
    }

    loadRegions();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("Predicting...");
    setIsError(false);

    const payload = {
      region: formData.region,
      month: Number(formData.month),
      year: Number(formData.year),
      rfh: Number(formData.rfh),
      rfh_avg: Number(formData.rfh_avg),
    };

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Prediction request failed.");
      }
      setResult(data);

      const heatmapRes = await fetch(`${API_BASE}/predict-all-regions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number(formData.year),
          month: Number(formData.month),
          rfh: Number(formData.rfh),
          rfh_avg: Number(formData.rfh_avg),
        }),
      });
      const heatmapData = await heatmapRes.json();
      if (!heatmapRes.ok) {
        throw new Error(heatmapData.error || "Map prediction request failed.");
      }
      setAllRegionResults(heatmapData.regions || []);
      setStatus("");
    } catch (err) {
      setStatus(err.message || "Prediction request failed.");
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  const probability = Number(result?.probability || 0);
  const percentage = Math.max(0, Math.min(100, probability * 100));

  return (
    <main className="container">
      <section className="card">
        <h1>Dengue Outbreak Predictor</h1>
        <p className="subtitle">Philippines regional rainfall-based outbreak risk</p>

        <form onSubmit={handleSubmit}>
          <label>
            Region
            <select name="region" value={formData.region} onChange={updateField} required>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>

          <label>
            Month
            <select name="month" value={formData.month} onChange={updateField} required>
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Year
            <input
              name="year"
              type="number"
              min="2000"
              max="2100"
              value={formData.year}
              onChange={updateField}
              required
            />
          </label>

          <label>
            Total Rainfall (rfh, mm)
            <input
              name="rfh"
              type="number"
              step="0.01"
              min="0"
              value={formData.rfh}
              onChange={updateField}
              required
            />
          </label>

          <label>
            Average Daily Rainfall (rfh_avg, mm)
            <input
              name="rfh_avg"
              type="number"
              step="0.01"
              min="0"
              value={formData.rfh_avg}
              onChange={updateField}
              required
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Predicting..." : "Predict Outbreak Risk"}
          </button>
        </form>

        <p className="status" style={{ color: isError ? "#b42318" : "#344054" }}>
          {status}
        </p>
      </section>

      {result && (
        <section className="card">
          <div className={`banner ${result.is_outbreak ? "yes" : "no"}`}>
            Outbreak: {result.is_outbreak ? "YES" : "NO"}
          </div>

          <div className="metrics">
            <div>
              <p className="metric-label">Probability</p>
              <div className="progress-wrap">
                <div className="progress-bar" style={{ width: `${percentage.toFixed(1)}%` }}></div>
              </div>
              <p>{percentage.toFixed(2)}%</p>
            </div>

            <div>
              <p className="metric-label">Risk Level</p>
              <span className={`risk-badge ${result.risk_level}`}>{result.risk_level}</span>
            </div>
          </div>

          <h2>Top 5 Feature Importances</h2>
          <FeatureChart topFeatures={result.top_features || []} />
        </section>
      )}

      <section className="card map-card">
        <h2>Regional Risk Heat Map</h2>
        <p className="map-note">
          Submit the form to color each Philippine region using predicted outbreak probability.
        </p>
        <RegionRiskMap regionRisks={allRegionResults} />
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
