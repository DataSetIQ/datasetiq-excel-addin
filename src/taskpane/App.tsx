import React, { useEffect, useState } from 'react';
import { CONNECT_MESSAGE, checkApiKey, searchSeries, browseBySource, SOURCES, isPaidPlan, PREMIUM_FEATURES, getUpgradeMessage } from '../shared/api';
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
import type { SearchResult } from '../shared/api';

// Type declaration for Excel global
declare const Excel: any;

type ViewState = 'loading' | 'connected' | 'disconnected' | 'unsupported';
type TabView = 'search' | 'favorites' | 'recent' | 'browse' | 'builder' | 'templates';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('loading');
  const [message, setMessage] = useState('Loading...');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState<TabView>('search');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [browseResults, setBrowseResults] = useState<SearchResult[]>([]);
  const [previewSeries, setPreviewSeries] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedForInsert, setSelectedForInsert] = useState<string[]>([]);
  const [builderStep, setBuilderStep] = useState<number>(1);
  const [builderFunction, setBuilderFunction] = useState<string>('DSIQ');
  const [builderSeries, setBuilderSeries] = useState<string>('');
  const [builderFreq, setBuilderFreq] = useState<string>('');
  const [builderStartDate, setBuilderStartDate] = useState<string>('');
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState('');

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
    const { valid, error } = await checkApiKey(key);
    if (!valid || error) {
      setIsPaid(false);
      setView('disconnected');
      setMessage(error || 'Invalid API key. Please re-enter your API key.');
      return;
    }
    // Note: Cannot determine plan level from API, defaulting to free
    // Premium features would require authentication through web app
    setIsPaid(false);
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
    setIsPaid(false);
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
  
  async function handleBrowse(source: string) {
    setSelectedSource(source);
    const { key } = await getStoredApiKey();
    const res = await browseBySource(key, source);
    setBrowseResults(res);
  }
  
  async function showPreview(seriesId: string) {
    setPreviewSeries(seriesId);
    setMessage('Loading preview...');
    const { key } = await getStoredApiKey();
    
    try {
      // Fetch latest value and metadata
      const { fetchSeries } = await import('../shared/api');
      const [latestRes, metaRes] = await Promise.all([
        fetchSeries({ seriesId, mode: 'latest', apiKey: key }),
        fetchSeries({ seriesId, mode: 'meta', apiKey: key })
      ]);
      
      // Check if this is a metadata-only dataset
      const isMetadataOnly = latestRes.response?.status === 'metadata_only';
      const isPending = latestRes.response?.status === 'ingestion_pending';
      
      setPreviewData({
        latest: latestRes.response?.scalar,
        meta: metaRes.response?.meta,
        error: latestRes.error || metaRes.error,
        isMetadataOnly,
        isPending,
        statusMessage: latestRes.response?.message
      });
      setMessage('');
    } catch (err: any) {
      setPreviewData({ error: err.message });
      setMessage('');
    }
  }
  
  async function requestFullIngestion(seriesId: string) {
    setMessage('Requesting full dataset ingestion...');
    const { key } = await getStoredApiKey();
    
    try {
      const response = await fetch(`https://www.datasetiq.com/api/datasets/${seriesId}/fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { 'Authorization': `Bearer ${key}` } : {})
        }
      });
      
      const data = await response.json();
      
      if (response.status === 401 || data.requiresAuth) {
        setMessage('⚠️ Authentication required. Visit datasetiq.com to sign up for full data access.');
        return;
      }
      
      if (response.status === 429 || data.upgradeToPro) {
        setMessage(`⚠️ Monthly limit reached (${data.remaining || 0}/${data.limit || 100}). Upgrade to Pro for unlimited access.`);
        return;
      }
      
      if (!response.ok) {
        setMessage(`⚠️ ${data.error || 'Failed to queue ingestion'}`);
        return;
      }
      
      setMessage('✅ Dataset ingestion started! Data will be available in 1-2 minutes.');
      
      // Update preview to show pending status
      setPreviewData(prev => ({
        ...prev,
        isPending: true,
        statusMessage: 'Dataset ingestion queued. Full data will be available shortly.'
      }));
      
    } catch (err: any) {
      setMessage(`⚠️ ${err.message || 'Failed to request ingestion'}`);
    }
  }
  
  function checkPremiumAccess(feature: string): boolean {
    // Note: Premium plan detection not available from public API
    // All users have access to basic features only
    setMessage(getUpgradeMessage(feature));
    return false; // Premium features disabled until authentication is added
  }
  
  function openBuilder() {
    if (!checkPremiumAccess(PREMIUM_FEATURES.FORMULA_BUILDER)) return;
    setActiveTab('builder');
    setBuilderStep(1);
  }
  
  function openTemplates() {
    if (!checkPremiumAccess(PREMIUM_FEATURES.TEMPLATES)) return;
    setActiveTab('templates');
    loadSavedTemplates();
  }
  
  function toggleMultiSelect(seriesId: string) {
    if (!checkPremiumAccess(PREMIUM_FEATURES.MULTI_INSERT)) return;
    setSelectedForInsert(prev => 
      prev.includes(seriesId) 
        ? prev.filter(id => id !== seriesId)
        : [...prev, seriesId]
    );
  }
  
  async function insertMultipleSeries() {
    if (selectedForInsert.length === 0) return;
    try {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getActiveWorksheet();
        const selectedRange = context.workbook.getSelectedRange();
        selectedRange.load('address');
        await context.sync();
        
        // Insert side-by-side
        for (let i = 0; i < selectedForInsert.length; i++) {
          const range = selectedRange.getOffsetRange(0, i);
          range.formulas = [[`=DSIQ("${selectedForInsert[i]}")`]];
        }
        await context.sync();
        setMessage(`Inserted ${selectedForInsert.length} series`);
        setSelectedForInsert([]);
      });
    } catch (err: any) {
      setMessage(err.message || 'Unable to insert');
    }
  }
  
  async function loadSavedTemplates() {
    try {
      const stored = await OfficeRuntime.storage.getItem('dsiq_templates');
      if (stored) {
        setSavedTemplates(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  async function saveCurrentTemplate() {
    if (!checkPremiumAccess(PREMIUM_FEATURES.TEMPLATES)) return;
    if (!templateName.trim()) {
      setMessage('❌ Please enter a template name');
      return;
    }
    
    setMessage('⏳ Scanning workbook for DSIQ formulas...');
    
    try {
      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load('items/name');
        await context.sync();
        
        const formulas: any[] = [];
        
        for (let i = 0; i < sheets.items.length; i++) {
          const sheet = sheets.items[i];
          const usedRange = sheet.getUsedRange();
          usedRange.load('formulas, address');
          await context.sync();
          
          const formulasArray = usedRange.formulas;
          for (let row = 0; row < formulasArray.length; row++) {
            for (let col = 0; col < formulasArray[row].length; col++) {
              const formula = formulasArray[row][col];
              if (typeof formula === 'string' && (formula.includes('=DSIQ(') || formula.includes('=DSIQ_LATEST('))) {
                formulas.push({
                  sheet: sheet.name,
                  formula: formula,
                  row: row,
                  col: col
                });
              }
            }
          }
        }
        
        if (formulas.length === 0) {
          setMessage('❌ No DSIQ formulas found in workbook');
          return;
        }
        
        const newTemplate = {
          id: Date.now().toString(),
          name: templateName,
          formulas: formulas,
          createdAt: new Date().toISOString()
        };
        
        const updatedTemplates = [...savedTemplates, newTemplate];
        await OfficeRuntime.storage.setItem('dsiq_templates', JSON.stringify(updatedTemplates));
        setSavedTemplates(updatedTemplates);
        setTemplateName('');
        setMessage(`✅ Template "${templateName}" saved with ${formulas.length} formulas`);
      });
    } catch (error) {
      console.error('Failed to save template:', error);
      setMessage('❌ Failed to save template');
    }
  }

  async function loadTemplate(template: any) {
    if (!checkPremiumAccess(PREMIUM_FEATURES.TEMPLATES)) return;
    
    setMessage(`⏳ Loading template "${template.name}"...`);
    
    try {
      await Excel.run(async (context) => {
        const activeSheet = context.workbook.worksheets.getActiveWorksheet();
        const activeCell = context.workbook.getSelectedRange();
        activeCell.load('rowIndex, columnIndex');
        await context.sync();
        
        const startRow = activeCell.rowIndex;
        const startCol = activeCell.columnIndex;
        
        for (const formulaInfo of template.formulas) {
          const targetRange = activeSheet.getCell(startRow + formulaInfo.row, startCol + formulaInfo.col);
          targetRange.formulas = [[formulaInfo.formula]];
        }
        
        await context.sync();
        setMessage(`✅ Loaded ${template.formulas.length} formulas from "${template.name}"`);
      });
    } catch (error) {
      console.error('Failed to load template:', error);
      setMessage('❌ Failed to load template');
    }
  }

  async function deleteTemplate(templateId: string) {
    const updatedTemplates = savedTemplates.filter(t => t.id !== templateId);
    await OfficeRuntime.storage.setItem('dsiq_templates', JSON.stringify(updatedTemplates));
    setSavedTemplates(updatedTemplates);
    setMessage('✅ Template deleted');
  }

  async function exportTemplates() {
    if (!checkPremiumAccess(PREMIUM_FEATURES.TEMPLATES)) return;
    
    const dataStr = JSON.stringify(savedTemplates, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dsiq-templates-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('✅ Templates exported');
  }

  async function importTemplates(event: React.ChangeEvent<HTMLInputElement>) {
    if (!checkPremiumAccess(PREMIUM_FEATURES.TEMPLATES)) return;
    
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!Array.isArray(imported)) {
        setMessage('❌ Invalid template file');
        return;
      }
      
      const updatedTemplates = [...savedTemplates, ...imported];
      await OfficeRuntime.storage.setItem('dsiq_templates', JSON.stringify(updatedTemplates));
      setSavedTemplates(updatedTemplates);
      setMessage(`✅ Imported ${imported.length} templates`);
    } catch (error) {
      console.error('Failed to import:', error);
      setMessage('❌ Failed to import templates');
    }
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

      {view === 'connected' && (
        <section className="card">
          <div className="card-title">Account</div>
          <div className="row">
            <div>
              <div className="label">Status</div>
              <div className="pill">✅ Connected</div>
            </div>
          </div>
          <div className="row">
            <div className="muted">Visit datasetiq.com/dashboard for account details and usage</div>
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
            <button 
              className={`tab ${activeTab === 'browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              📚 Browse
            </button>
            <button 
              className={`tab premium-tab ${activeTab === 'builder' ? 'active' : ''}`}
              onClick={openBuilder}
              title={isPaid ? 'Formula Builder' : 'Premium Feature'}
            >
              🔧 Builder {!isPaid && '🔒'}
            </button>
            <button 
              className={`tab premium-tab ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={openTemplates}
              title={isPaid ? 'Templates' : 'Premium Feature'}
            >
              📁 Templates {!isPaid && '🔒'}
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
              <>
                {isPaid && (
                  <div style={{marginBottom: '12px', padding: '8px', background: '#f0f9ff', borderRadius: '6px'}}>
                    <label style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'}}>
                      <input type="checkbox" onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedForInsert(results.map(r => r.id));
                        } else {
                          setSelectedForInsert([]);
                        }
                      }} />
                      Select All ({selectedForInsert.length} selected)
                    </label>
                    {selectedForInsert.length > 0 && (
                      <button style={{marginTop: '8px', width: '100%'}} onClick={insertMultipleSeries}>
                        Insert {selectedForInsert.length} Series
                      </button>
                    )}
                  </div>
                )}
                <ul>
                  {results.map((r) => (
                    <li key={r.id} className="result-item">
                      {isPaid && (
                        <input 
                          type="checkbox" 
                          checked={selectedForInsert.includes(r.id)}
                          onChange={() => toggleMultiSelect(r.id)}
                          style={{marginRight: '8px'}}
                        />
                      )}
                      <div>
                        <div className="result-id">{r.id}</div>
                        <div className="muted">{r.title}</div>
                      </div>
                      <div className="result-buttons">
                        <button className="preview-btn" onClick={() => showPreview(r.id)} title="Preview data">
                        👁️
                      </button>
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
            </>
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
          
          {activeTab === 'browse' && (
          <div className="browse-view">
            <label className="label">Select Data Source</label>
            <select 
              value={selectedSource} 
              onChange={(e) => handleBrowse(e.target.value)}
              style={{width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #e5e7eb'}}
            >
              <option value="">Choose a source...</option>
              {SOURCES.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            
            {browseResults.length === 0 && <div className="muted">Select a source to browse series.</div>}
            {browseResults.length > 0 && (
              <div className="results">
                <div className="muted" style={{marginBottom: '8px'}}>
                  Showing {browseResults.length} series from {selectedSource}
                </div>
                <ul>
                  {browseResults.map((r) => (
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
                          📊
                        </button>
                        <button className="insert-btn" onClick={() => insertFormula(r.id, 'DSIQ_LATEST')} title="Insert DSIQ_LATEST formula">
                          📈
                        </button>
                        <button className="insert-btn" onClick={() => insertFormula(r.id, 'DSIQ_YOY')} title="Insert DSIQ_YOY formula">
                          📉
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          )}
          
          {activeTab === 'builder' && (
          <div className="builder-view">
            <div className="premium-badge">🔒 Premium Feature</div>
            <div className="builder-steps">
              <div className={`builder-step ${builderStep === 1 ? 'active' : ''}`}>
                <h4>Step 1: Choose Function</h4>
                <select value={builderFunction} onChange={(e) => setBuilderFunction(e.target.value)} style={{width: '100%', padding: '8px', borderRadius: '6px'}}>
                  <option value="DSIQ">DSIQ - Full time series array</option>
                  <option value="DSIQ_LATEST">DSIQ_LATEST - Most recent value</option>
                  <option value="DSIQ_VALUE">DSIQ_VALUE - Value on specific date</option>
                  <option value="DSIQ_YOY">DSIQ_YOY - Year-over-year change</option>
                  <option value="DSIQ_META">DSIQ_META - Series metadata</option>
                </select>
                <button onClick={() => setBuilderStep(2)} style={{marginTop: '8px'}}>Next →</button>
              </div>
              
              {builderStep >= 2 && (
                <div className={`builder-step ${builderStep === 2 ? 'active' : ''}`}>
                  <h4>Step 2: Enter Series ID</h4>
                  <input 
                    placeholder='e.g., FRED-GDP' 
                    value={builderSeries} 
                    onChange={(e) => setBuilderSeries(e.target.value)}
                    style={{width: '100%', padding: '8px'}}
                  />
                  <div className="row" style={{marginTop: '8px'}}>
                    <button className="secondary" onClick={() => setBuilderStep(1)}>← Back</button>
                    <button onClick={() => setBuilderStep(3)}>Next →</button>
                  </div>
                </div>
              )}
              
              {builderStep >= 3 && builderFunction === 'DSIQ' && (
                <div className={`builder-step ${builderStep === 3 ? 'active' : ''}`}>
                  <h4>Step 3: Optional Parameters</h4>
                  <label className="label">Frequency</label>
                  <select value={builderFreq} onChange={(e) => setBuilderFreq(e.target.value)} style={{width: '100%', padding: '8px', marginBottom: '8px'}}>
                    <option value="">Auto</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                  <label className="label">Start Date</label>
                  <input 
                    type="date" 
                    value={builderStartDate} 
                    onChange={(e) => setBuilderStartDate(e.target.value)}
                    style={{width: '100%', padding: '8px'}}
                  />
                  <div className="row" style={{marginTop: '8px'}}>
                    <button className="secondary" onClick={() => setBuilderStep(2)}>← Back</button>
                    <button onClick={() => insertFormula(builderSeries, builderFunction)}>Insert Formula</button>
                  </div>
                </div>
              )}
              
              {builderStep >= 3 && builderFunction !== 'DSIQ' && (
                <div className="builder-step active">
                  <h4>Step 3: Insert</h4>
                  <p className="muted">Ready to insert formula</p>
                  <div className="row">
                    <button className="secondary" onClick={() => setBuilderStep(2)}>← Back</button>
                    <button onClick={() => insertFormula(builderSeries, builderFunction)}>Insert Formula</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
          
          {activeTab === 'templates' && (
          <div className="templates-view">
            <div className="premium-badge">🔒 Premium Feature</div>
            <h4>Saved Templates</h4>
            <p className="muted">Save and reuse collections of DSIQ formulas</p>
            
            <div style={{marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px'}}>
              <input 
                type="text" 
                placeholder="Template name..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                style={{marginBottom: '8px'}}
              />
              <button onClick={saveCurrentTemplate}>💾 Save Current Formulas</button>
              <p className="muted" style={{marginTop: '8px', fontSize: '11px'}}>Scans workbook for all DSIQ formulas</p>
            </div>
            
            <div style={{marginBottom: '12px'}}>
              <button className="secondary" onClick={exportTemplates} style={{marginRight: '8px'}}>
                📤 Export All
              </button>
              <label className="secondary" style={{padding: '8px 16px', cursor: 'pointer', display: 'inline-block'}}>
                📥 Import
                <input 
                  type="file" 
                  accept=".json"
                  onChange={importTemplates}
                  style={{display: 'none'}}
                />
              </label>
            </div>
            
            {savedTemplates.length === 0 && <div className="muted">No templates saved yet.</div>}
            {savedTemplates.length > 0 && (
              <ul>
                {savedTemplates.map((template) => (
                  <li key={template.id} className="result-item" style={{alignItems: 'flex-start'}}>
                    <div style={{flex: 1}}>
                      <div className="result-id">{template.name}</div>
                      <div className="muted">{template.formulas.length} formulas • {new Date(template.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="result-buttons">
                      <button className="preview-btn" onClick={() => loadTemplate(template)} title="Load template">
                        📥
                      </button>
                      <button className="favorite-btn" onClick={() => deleteTemplate(template.id)} title="Delete template">
                        🗑️
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
        <div className="card-title">📖 Formula Reference</div>
        <div style={{fontSize: '13px', lineHeight: '1.6'}}>
          
          <div style={{marginBottom: '16px'}}>
            <strong style={{color: '#1f2937'}}>DSIQ(series_id, [frequency], [start_date])</strong>
            <div className="muted" style={{marginTop: '4px'}}>Returns time series data as array (spills into cells below)</div>
            <code style={{display: 'block', marginTop: '6px', padding: '6px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px'}}>
              =DSIQ("wb/NE.EXP.GNFS.ZS/USA")<br/>
              =DSIQ("fred/GDP", "Q", "2020-01-01")
            </code>
          </div>
          
          <div style={{marginBottom: '16px'}}>
            <strong style={{color: '#1f2937'}}>DSIQ_LATEST(series_id)</strong>
            <div className="muted" style={{marginTop: '4px'}}>Returns most recent value (single cell)</div>
            <code style={{display: 'block', marginTop: '6px', padding: '6px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px'}}>
              =DSIQ_LATEST("wb/NE.EXP.GNFS.ZS/USA")
            </code>
          </div>
          
          <div style={{marginBottom: '16px'}}>
            <strong style={{color: '#1f2937'}}>DSIQ_VALUE(series_id, date)</strong>
            <div className="muted" style={{marginTop: '4px'}}>Returns value at specific date</div>
            <code style={{display: 'block', marginTop: '6px', padding: '6px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px'}}>
              =DSIQ_VALUE("fred/GDP", "2024-01-01")<br/>
              =DSIQ_VALUE("bls/CUUR0000SA0", A2)
            </code>
          </div>
          
          <div style={{marginBottom: '16px'}}>
            <strong style={{color: '#1f2937'}}>DSIQ_YOY(series_id)</strong>
            <div className="muted" style={{marginTop: '4px'}}>Returns year-over-year % change</div>
            <code style={{display: 'block', marginTop: '6px', padding: '6px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px'}}>
              =DSIQ_YOY("fred/GDP")
            </code>
          </div>
          
          <div style={{marginBottom: '16px'}}>
            <strong style={{color: '#1f2937'}}>DSIQ_META(series_id, field)</strong>
            <div className="muted" style={{marginTop: '4px'}}>Returns metadata field (title, frequency, units, etc.)</div>
            <code style={{display: 'block', marginTop: '6px', padding: '6px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px'}}>
              =DSIQ_META("wb/NE.EXP.GNFS.ZS/USA", "title")<br/>
              =DSIQ_META("fred/GDP", "frequency")<br/>
              =DSIQ_META("bls/CUUR0000SA0", "units")
            </code>
          </div>
          
          <div className="muted" style={{marginTop: '12px', padding: '8px', background: '#eff6ff', borderRadius: '6px', fontSize: '12px'}}>
            <strong>💡 Tips:</strong><br/>
            • Use Search tab to find series IDs<br/>
            • Browse by Source for data discovery<br/>
            • Favorites/Recent for quick access<br/>
            • DSIQ() spills automatically in Excel 365
          </div>
        </div>
      </section>
      
      {previewSeries && (
        <div className="preview-modal" onClick={() => setPreviewSeries(null)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewSeries}</h3>
              <button className="close-btn" onClick={() => setPreviewSeries(null)}>✕</button>
            </div>
            {previewData?.error && (
              <div className="muted" style={{color: '#b91c1c'}}>{previewData.error}</div>
            )}
            {previewData && !previewData.error && (
              <div className="preview-body">
                {/* Metadata-only notice */}
                {previewData.isMetadataOnly && (
                  <div style={{marginBottom: '12px', padding: '10px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fbbf24'}}>
                    <strong style={{color: '#92400e', display: 'block', marginBottom: '4px'}}>📊 Metadata Only</strong>
                    <p style={{fontSize: '12px', color: '#78350f', margin: 0}}>
                      This dataset hasn't been fully ingested yet. Click below to fetch the complete time-series data.
                    </p>
                    <button 
                      onClick={() => requestFullIngestion(previewSeries!)}
                      style={{marginTop: '8px', width: '100%', padding: '8px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer'}}
                    >
                      🚀 Fetch Full Dataset
                    </button>
                  </div>
                )}
                
                {/* Ingestion pending notice */}
                {previewData.isPending && (
                  <div style={{marginBottom: '12px', padding: '10px', background: '#dbeafe', borderRadius: '6px', border: '1px solid '#3b82f6'}}>
                    <strong style={{color: '#1e3a8a', display: 'block', marginBottom: '4px'}}>⏳ Ingestion In Progress</strong>
                    <p style={{fontSize: '12px', color: '#1e40af', margin: 0}}>
                      {previewData.statusMessage || 'Full dataset is being fetched. This usually takes 1-2 minutes. Please check back shortly.'}
                    </p>
                  </div>
                )}
                
                <div className="preview-item">
                  <strong>Latest Value:</strong> {previewData.latest ?? 'N/A'}
                  {previewData.latest && <button className="copy-btn" onClick={() => navigator.clipboard.writeText(String(previewData.latest))} title="Copy">📋</button>}
                </div>
                
                {isPaid && previewData.meta && (
                  <>
                    <div className="premium-badge" style={{marginTop: '12px', marginBottom: '8px'}}>✨ Full Metadata (Premium)</div>
                    {Object.entries(previewData.meta).map(([key, value]) => (
                      <div key={key} className="preview-item">
                        <strong>{key}:</strong> {String(value)}
                        <button className="copy-btn" onClick={() => navigator.clipboard.writeText(String(value))} title="Copy">📋</button>
                      </div>
                    ))}
                  </>
                )}
                
                {!isPaid && previewData.meta && (
                  <>
                    {previewData.meta?.title && (
                      <div className="preview-item">
                        <strong>Title:</strong> {previewData.meta.title}
                      </div>
                    )}
                    {previewData.meta?.frequency && (
                      <div className="preview-item">
                        <strong>Frequency:</strong> {previewData.meta.frequency}
                      </div>
                    )}
                    {previewData.meta?.units && (
                      <div className="preview-item">
                        <strong>Units:</strong> {previewData.meta.units}
                      </div>
                    )}
                    <div className="upgrade-prompt" style={{marginTop: '12px', padding: '8px', background: '#fef3c7', borderRadius: '6px'}}>
                      🔒 Upgrade to Premium to view all {Object.keys(previewData.meta).length} metadata fields
                      <a href="https://datasetiq.com/pricing" target="_blank" rel="noreferrer" style={{display: 'block', marginTop: '4px', fontWeight: '600'}}>
                        View Plans →
                      </a>
                    </div>
                  </>
                )}
                
                <div className="row" style={{marginTop: '16px'}}>
                  <button onClick={() => { insertFormula(previewSeries, 'DSIQ'); setPreviewSeries(null); }}>
                    Insert Array
                  </button>
                  <button className="secondary" onClick={() => { insertFormula(previewSeries, 'DSIQ_LATEST'); setPreviewSeries(null); }}>
                    Insert Latest
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
