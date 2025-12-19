import React, { useEffect, useState } from 'react';
import { CONNECT_MESSAGE, fetchProfile, searchSeries } from '../shared/api';
import { 
  clearStoredApiKey, 
  getStoredApiKey, 
  setStoredApiKey,
  getFavorites,
  addFavorite,
  removeFavorite,
  getRecent,
  addRecent
} from '../shared/storage';
import type { MeResponse, SearchResult } from '../shared/api';

// Type declaration for Excel global
declare const Excel: any;

type ViewState = 'loading' | 'connected' | 'disconnected' | 'unsupported';
type TabView = 'search' | 'favorites' | 'recent';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('loading');
  const [message, setMessage] = useState('Loading...');
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState<TabView>('search');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    const { key, supported } = await getStoredApiKey();
    if (!supported) {
      setView('unsupported');
      setMessage(CONNECT_MESSAGE);
      return;
    }
    
    // Load favorites and recent regardless of connection
    await loadFavoritesAndRecent();
    
    if (!key) {
      setView('disconnected');
      setMessage('Connect your account to unlock quota and entitlements.');
      return;
    }
    await loadProfile(key);
  }
  
  async function loadFavoritesAndRecent() {
    const favs = await getFavorites();
    const rec = await getRecent();
    setFavorites(favs);
    setRecent(rec);
  }

  async function loadProfile(key: string) {
    setView('loading');
    setMessage('Connecting...');
    const { profile, error } = await fetchProfile(key);
    if (error || !profile) {
      setProfile(null);
      setView('disconnected');
      setMessage(error || 'Unable to connect. Please re-enter your API key.');
      return;
    }
    setProfile(profile);
    setView('connected');
    setMessage('Connected');
  }

  async function handleSave() {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setMessage('API key required.');
      return;
    }
    try {
      await setStoredApiKey(trimmed);
      setApiKeyInput('');
      await loadProfile(trimmed);
    } catch (err: any) {
      setMessage(err.message || 'Unable to save key.');
      setView('unsupported');
    }
  }

  async function handleDisconnect() {
    await clearStoredApiKey();
    setProfile(null);
    setView('disconnected');
    setMessage('Disconnected. Enter your API key to reconnect.');
  }

  async function handleSearch(evt?: React.FormEvent) {
    if (evt) evt.preventDefault();
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    const { key } = await getStoredApiKey();
    const res = await searchSeries(key, searchQuery.trim());
    setResults(res);
  }

  async function insertFormula(seriesId: string, functionName: string = 'DSIQ') {
    try {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getActiveWorksheet();
        const range = sheet.getRange();
        range.load('address');
        await context.sync();
        
        const selectedRange = context.workbook.getSelectedRange();
        let formula = '';
        switch(functionName) {
          case 'DSIQ':
            formula = `=DSIQ("${seriesId}")`;
            break;
          case 'DSIQ_LATEST':
            formula = `=DSIQ_LATEST("${seriesId}")`;
            break;
          case 'DSIQ_YOY':
            formula = `=DSIQ_YOY("${seriesId}")`;
            break;
          default:
            formula = `=DSIQ("${seriesId}")`;
        }
        selectedRange.formulas = [[formula]];
        await context.sync();
        setMessage(`Inserted ${functionName}("${seriesId}")`);
        
        // Add to recent
        await addRecent(seriesId);
        await loadFavoritesAndRecent();
      });
    } catch (err: any) {
      setMessage(err.message || 'Unable to insert formula');
    }
  }
  
  async function toggleFavorite(seriesId: string) {
    if (favorites.includes(seriesId)) {
      await removeFavorite(seriesId);
    } else {
      await addFavorite(seriesId);
    }
    await loadFavoritesAndRecent();
  }

  const showConnect = view === 'disconnected' || view === 'unsupported';

  return (
    <div className="shell">
      <header>
        <div>
          <div className="eyebrow">DataSetIQ</div>
          <h2>Spreadsheet Bridge</h2>
          <p className="muted">{message}</p>
        </div>
      </header>

      {view === 'connected' && profile && (
        <section className="card">
          <div className="card-title">Account</div>
          <div className="row">
            <div>
              <div className="label">Email</div>
              <div>{profile.email}</div>
            </div>
            <div>
              <div className="label">Plan</div>
              <div className="pill">{profile.plan}</div>
            </div>
          </div>
          <div className="row">
            <div>
              <div className="label">Quota</div>
              <div>
                {profile.quota.used} / {profile.quota.limit} (resets {profile.quota.reset})
              </div>
            </div>
            <div>
              <div className="label">Status</div>
              <div>{profile.status}</div>
            </div>
          </div>
          <div className="row end">
            <button className="secondary" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        </section>
      )}

      {showConnect && (
        <section className="card">
          <div className="card-title">Connect your account</div>
          <label className="label" htmlFor="apiKey">
            API Key
          </label>
          <input
            id="apiKey"
            placeholder="Paste your DataSetIQ API key"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
          />
          <div className="row">
            <button onClick={handleSave}>Save & Connect</button>
            <a className="link" href="https://datasetiq.com/dashboard/api-keys" target="_blank" rel="noreferrer">
              Get a key
            </a>
          </div>
        </section>
      )}

      {view === 'connected' && (
        <section className="card">
          <div className="card-title">Series Lookup</div>
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              🔍 Search
            </button>
            <button 
              className={`tab ${activeTab === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              ⭐ Favorites ({favorites.length})
            </button>
            <button 
              className={`tab ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveTab('recent')}
            >
              🕒 Recent ({recent.length})
            </button>
          </div>
          
          {activeTab === 'search' && (
          <>
          <form onSubmit={handleSearch}>
            <input
              placeholder='Try "FRED-GDP"'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="row">
              <button type="submit">Search</button>
              <span className="muted">Use results in `=DSIQ("series_id")`</span>
            </div>
          </form>
          <div className="results">
            {results.length === 0 && <div className="muted">No results yet.</div>}
            {results.length > 0 && (
              <ul>
                {results.map((r) => (
                  <li key={r.id} className="result-item">
                    <div>
                      <div className="result-id">{r.id}</div>
                      <div className="muted">{r.title}</div>
                    </div>
                    <div className="result-buttons">
                      <button className="fav-btn" onClick={() => toggleFavorite(r.id)} title={favorites.includes(r.id) ? 'Remove from favorites' : 'Add to favorites'}>
                        {favorites.includes(r.id) ? '⭐' : '☆'}
                      </button>
                      <button className="insert-btn" onClick={() => insertFormula(r.id, 'DSIQ')} title="Insert DSIQ formula">
                        📊 Array
                      </button>
                      <button className="insert-btn" onClick={() => insertFormula(r.id, 'DSIQ_LATEST')} title="Insert DSIQ_LATEST formula">
                        📈 Latest
                      </button>
                      <button className="insert-btn" onClick={() => insertFormula(r.id, 'DSIQ_YOY')} title="Insert DSIQ_YOY formula">
                        📉 YoY
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          </>
          )}
          
          {activeTab === 'favorites' && (
          <div className="favorites-list">
            {favorites.length === 0 && <div className="muted">No favorites yet. Click ⭐ to add series.</div>}
            {favorites.length > 0 && (
              <ul>
                {favorites.map((id) => (
                  <li key={id} className="result-item">
                    <div>
                      <div className="result-id">{id}</div>
                    </div>
                    <div className="result-buttons">
                      <button className="fav-btn" onClick={() => toggleFavorite(id)} title="Remove from favorites">
                        ⭐
                      </button>
                      <button className="insert-btn" onClick={() => insertFormula(id, 'DSIQ')} title="Insert DSIQ formula">
                        📊
                      </button>
                      <button className="insert-btn" onClick={() => insertFormula(id, 'DSIQ_LATEST')} title="Insert DSIQ_LATEST formula">
                        📈
                      </button>
                      <button className="insert-btn" onClick={() => insertFormula(id, 'DSIQ_YOY')} title="Insert DSIQ_YOY formula">
                        📉
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          )}
          
          {activeTab === 'recent' && (
          <div className="recent-list">
            {recent.length === 0 && <div className="muted">No recent series yet. Insert a formula to track history.</div>}
            {recent.length > 0 && (
              <ul>
                {recent.map((id) => (
                  <li key={id} className="result-item">
                    <div>
                      <div className="result-id">{id}</div>
                    </div>
                    <div className="result-buttons">
                      <button className="fav-btn" onClick={() => toggleFavorite(id)} title={favorites.includes(id) ? 'Remove from favorites' : 'Add to favorites'}>
                        {favorites.includes(id) ? '⭐' : '☆'}
                      </button>
                      <button className="insert-btn" onClick={() => insertFormula(id, 'DSIQ')} title="Insert DSIQ formula">
                        📊
                      </button>
                      <button className="insert-btn" onClick={() => insertFormula(id, 'DSIQ_LATEST')} title="Insert DSIQ_LATEST formula">
                        📈
                      </button>
                      <button className="insert-btn" onClick={() => insertFormula(id, 'DSIQ_YOY')} title="Insert DSIQ_YOY formula">
                        📉
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          )}
        </section>
      )}

      <section className="card">
        <div className="card-title">Usage</div>
        <ul className="muted">
          <li>Array: =DSIQ("FRED-GDP", [frequency], [start_date])</li>
          <li>Latest: =DSIQ_LATEST("FRED-GDP")</li>
          <li>Value: =DSIQ_VALUE("FRED-GDP", "2024-01-01")</li>
          <li>YoY: =DSIQ_YOY("FRED-GDP")</li>
          <li>Meta: =DSIQ_META("FRED-GDP", "title")</li>
        </ul>
      </section>
    </div>
  );
};

export default App;
