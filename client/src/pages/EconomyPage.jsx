import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { api, showToast } from '../api';
import { 
  CreditCard, Zap, ArrowUpRight, ArrowDownRight, ShoppingBag, 
  TrendingUp, ShieldCheck, Award, RefreshCw, X, PlusCircle, 
  HelpCircle, CheckCircle2, Tag
} from 'lucide-react';

export default function EconomyPage() {
  const [wallet, setWallet] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState({ total_balance: 0 });
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [txFilter, setTxFilter] = useState('ALL');
  const [showInfo, setShowInfo] = useState(true);
  
  // Modals
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [topupAmount, setTopupAmount] = useState(1000);
  const [topupMethod, setTopupMethod] = useState('UPI FastPay');
  const [isTopupLoading, setIsTopupLoading] = useState(false);

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState(500);
  const [transferTarget, setTransferTarget] = useState('zeel@okaxis');
  const [isTransferLoading, setIsTransferLoading] = useState(false);

  const [showSellModal, setShowSellModal] = useState(false);
  const [sellCredits, setSellCredits] = useState(50);
  const [sellPrice, setSellPrice] = useState(58);
  const [sellType, setSellType] = useState('Clean EV Mobility Batch');
  const [isSelling, setIsSelling] = useState(false);

  useEffect(() => {
    fetchEconomyData();
  }, []);

  const fetchEconomyData = async () => {
    try {
      const [walletRes, marketRes, creditsRes] = await Promise.all([
        api.get('/api/wallet/balance'),
        api.get('/api/marketplace/listings'),
        api.get('/api/credits/ledger')
      ]);
      setWallet(walletRes.data);
      setListings(marketRes.data || []);
      setCredits(creditsRes.data || { total_balance: 0 });
      setLoading(false);
    } catch (err) {
      showToast('Economy Stream Sync Failed', 'error');
    }
  };

  const buyCredits = async (listingId, sellerName, amount, price) => {
    if ((wallet?.balance || 0) < price) {
      return showToast('Insufficient VahanPay balance. Please Add Funds first.', 'error');
    }
    try {
      await api.post('/api/marketplace/buy/' + listingId);
      showToast('Acquired ' + amount + ' VC from ' + sellerName + '!', 'success');
      fetchEconomyData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Transaction Failed', 'error');
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    if (topupAmount <= 0) return showToast('Enter a valid amount', 'error');
    setIsTopupLoading(true);
    try {
      await api.post('/api/wallet/topup', { amount: topupAmount, method: topupMethod });
      showToast('Added ₹' + topupAmount.toLocaleString() + ' to VahanPay!', 'success');
      setShowAddFunds(false);
      fetchEconomyData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Top-up failed', 'error');
    } finally {
      setIsTopupLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (transferAmount <= 0) return showToast('Enter a valid amount', 'error');
    if (transferAmount > (wallet?.balance || 0)) return showToast('Amount exceeds available balance', 'error');
    setIsTransferLoading(true);
    try {
      await api.post('/api/wallet/transfer', { amount: transferAmount, target: transferTarget });
      showToast('Transferred ₹' + transferAmount.toLocaleString() + ' to ' + transferTarget + '!', 'success');
      setShowTransfer(false);
      fetchEconomyData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Transfer failed', 'error');
    } finally {
      setIsTransferLoading(false);
    }
  };

  const handleSellCredits = async (e) => {
    e.preventDefault();
    const userBal = Number(credits?.total_balance ?? credits?.total_credits ?? 0);
    if (sellCredits <= 0) return showToast('Enter credits amount', 'error');
    if (sellCredits > userBal) return showToast('You only have ' + userBal + ' VC available', 'error');
    if (sellPrice <= 0) return showToast('Enter valid asking price', 'error');

    setIsSelling(true);
    try {
      await api.post('/api/marketplace/sell', {
        amount: sellCredits,
        price: sellPrice,
        credit_type: sellType
      });
      showToast('Listed ' + sellCredits + ' VC on Open Marketplace!', 'success');
      setShowSellModal(false);
      fetchEconomyData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to list credits', 'error');
    } finally {
      setIsSelling(false);
    }
  };

  const filteredListings = listings.filter(l => {
    if (categoryFilter === 'ALL') return true;
    return (l.credit_type || '').toLowerCase().includes(categoryFilter.toLowerCase());
  });

  const filteredHistory = (wallet?.history || []).filter(tx => {
    if (txFilter === 'ALL') return true;
    if (txFilter === 'CREDIT') return tx.type === 'credit';
    if (txFilter === 'DEBIT') return tx.type === 'debit';
    return true;
  });

  const totalCredits = Number(credits?.total_balance ?? credits?.total_credits ?? 0);
  const totalCo2 = (totalCredits * 0.15).toFixed(1);

  if (loading || !wallet) return (
    <div className="vs-loading-wrap">
      <div className="vs-spin"></div>
    </div>
  );

  return (
    <div className="app">
      <Navbar />
      <div className="page-wrapper">
        <div className="page-content" style={{ maxWidth: 1600 }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
            <div>
              <div className="eyebrow" style={{ animationDelay: '0s' }}>
                <div className="eyebrow-dot"></div> Decentralized Carbon Exchange & VahanPay
              </div>
              <h1 className="hero-title" style={{ fontSize: '3rem', marginBottom: 4 }}>
                VahanSetu <span className="accent">Economy</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
                Unified green mobility ledger: monetize verified carbon offsets, trade peer-to-peer, and manage liquidity.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ textAlign: 'right', padding: '10px 18px', background: 'rgba(0,255,163,0.06)', borderRadius: 16, border: '1px solid rgba(0,255,163,0.2)' }}>
                 <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>PLATFORM BENCHMARK</div>
                 <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--green)', fontFamily: 'Syne, sans-serif' }}>₹1.25 <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>/ VC</span></div>
              </div>
              <button className="vs-btn vs-btn-secondary vs-icon-text" onClick={() => setShowInfo(!showInfo)} style={{ padding: '12px 18px', borderRadius: 14 }}>
                <HelpCircle size={16} /> {showInfo ? 'Hide Guide' : 'How It Works'}
              </button>
            </div>
          </div>

          {/* EDUCATIONAL GUIDE BANNER */}
          {showInfo && (
            <div className="vs-glass vs-tilt" style={{ 
              padding: '24px 28px', 
              borderRadius: '24px', 
              marginBottom: '32px',
              background: 'linear-gradient(135deg, rgba(0,240,255,0.05), rgba(0,255,163,0.05))',
              border: '1px solid rgba(0,240,255,0.2)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,240,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontFamily: 'Syne, sans-serif', fontSize: '1.1rem', color: '#fff' }}>
                      Understanding the VahanSetu Carbon Economy & Open Marketplace
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      How electric vehicle telemetry converts clean kilowatts into tradable digital assets.
                    </div>
                  </div>
                </div>
                <button className="vs-btn-icon" onClick={() => setShowInfo(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                <div style={{ padding: 16, background: 'rgba(0,0,0,0.25)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--cyan)', fontWeight: 800, fontSize: '0.85rem', marginBottom: 6 }}>
                    <Zap size={15} /> 1. Generate Credits (VC)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Every <strong style={{ color: '#fff' }}>10 kWh</strong> of clean charging during off-peak solar hours or supplying power back to the grid via V2G automatically mints <strong style={{ color: 'var(--green)' }}>1 VahanCredit</strong> on your blockchain ledger.
                  </div>
                </div>

                <div style={{ padding: 16, background: 'rgba(0,0,0,0.25)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)', fontWeight: 800, fontSize: '0.85rem', marginBottom: 6 }}>
                    <ShoppingBag size={15} /> 2. Peer-to-Peer Trading
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Surplus credits can be traded in the <strong style={{ color: '#fff' }}>Open Marketplace</strong>. Corporate fleets and ESG enterprises buy your credits to legally fulfill statutory net-zero and carbon emission compliance.
                  </div>
                </div>

                <div style={{ padding: 16, background: 'rgba(0,0,0,0.25)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--purple)', fontWeight: 800, fontSize: '0.85rem', marginBottom: 6 }}>
                    <CreditCard size={15} /> 3. Real Liquid INR Payouts
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    When your listed credits sell, Indian Rupees (<strong style={{ color: '#fff' }}>₹ INR</strong>) deposit directly into your VahanPay wallet. Use it for free fast-charging sessions or cash out instantly to your bank account via UPI.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MAIN DUAL COLUMN LAYOUT */}
          <div style={{ display: 'grid', gridTemplateColumns: '460px 1fr', gap: '30px' }}>
            
            {/* LEFT COLUMN: VAHANPAY WALLET & RECENT ACTIVITY */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* WALLET BALANCE CARD */}
              <div className="vs-glass" style={{ 
                padding: '36px 32px', 
                borderRadius: '32px', 
                background: 'linear-gradient(135deg, rgba(0,240,255,0.12), rgba(181,109,255,0.08))',
                border: '1px solid rgba(0,240,255,0.25)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: 0, right: 0, padding: 24 }}>
                  <CreditCard size={48} color="var(--cyan)" style={{ opacity: 0.25 }} />
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  Active VahanPay Balance
                </div>
                <div style={{ fontSize: '3.6rem', fontWeight: 900, fontFamily: 'Syne, sans-serif', letterSpacing: '-2px', color: '#fff', lineHeight: 1 }}>
                  ₹{(wallet.balance || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cyan)', marginTop: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={13} /> Instant Node Settlement Active
                </div>
                
                <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                  <button className="vs-btn vs-btn-primary" onClick={() => setShowAddFunds(true)} style={{ flex: 1, borderRadius: 14, padding: '12px 18px', fontWeight: 800 }}>
                    <PlusCircle size={16} /> Add Funds
                  </button>
                  <button className="vs-btn vs-btn-secondary" onClick={() => setShowTransfer(true)} style={{ flex: 1, borderRadius: 14, padding: '12px 18px', fontWeight: 800 }}>
                    <ArrowUpRight size={16} /> Payout / UPI
                  </button>
                </div>
              </div>

              {/* RECENT ACTIVITY STREAM */}
              <div className="vs-glass" style={{ padding: '28px', borderRadius: '32px', flex: 1 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>Recent Ledger Activity</h3>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Real-time settlements, payouts, and charge debits</div>
                    </div>
                    <button className="vs-btn-icon" onClick={fetchEconomyData} title="Refresh Ledger" style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.04)' }}>
                      <RefreshCw size={14} color="var(--text-muted)" />
                    </button>
                 </div>

                 {/* Filters for Activity */}
                 <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                    {['ALL', 'CREDIT', 'DEBIT'].map(tab => (
                      <button 
                        key={tab} 
                        onClick={() => setTxFilter(tab)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 20,
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          background: txFilter === tab ? 'var(--cyan)' : 'rgba(255,255,255,0.04)',
                          color: txFilter === tab ? '#000' : 'var(--text-muted)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {tab === 'ALL' ? 'All Activity' : tab === 'CREDIT' ? 'Earnings (+)' : 'Charges / Debits (-)'}
                      </button>
                    ))}
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 420, overflowY: 'auto' }}>
                    {filteredHistory.length > 0 ? (
                      filteredHistory.map((tx, i) => (
                        <div key={i} style={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                          padding: '14px 16px', background: 'rgba(255,255,255,0.02)', 
                          border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16 
                        }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, marginRight: 12 }}>
                            <div style={{ 
                              width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                              background: tx.type === 'credit' ? 'rgba(0,255,163,0.12)' : 'rgba(255,61,107,0.12)', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              color: tx.type === 'credit' ? 'var(--green)' : 'var(--red)' 
                            }}>
                               {tx.type === 'credit' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {tx.description}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{new Date(tx.timestamp).toLocaleDateString()} · {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span style={{ 
                                  fontSize: '0.55rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase',
                                  background: tx.type === 'credit' ? 'rgba(0,255,163,0.1)' : 'rgba(255,61,107,0.1)',
                                  color: tx.type === 'credit' ? 'var(--green)' : 'var(--red)'
                                }}>
                                  {tx.type}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div style={{ 
                            fontWeight: 900, fontFamily: 'Syne, sans-serif', fontSize: '1rem',
                            color: tx.type === 'credit' ? 'var(--green)' : '#fff', flexShrink: 0
                          }}>
                            {tx.type === 'credit' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        No transactions found in this filter category.
                      </div>
                    )}
                 </div>
              </div>
            </div>

            {/* RIGHT COLUMN: CARBON STEWARDSHIP & OPEN MARKETPLACE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
               
               {/* STEWARDSHIP METRICS BAR & LIST CREDITS ACTION */}
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 220px', gap: '18px' }}>
                  <div className="vs-glass vs-tilt" style={{ padding: '22px 26px', borderRadius: '24px', borderLeft: '4px solid var(--green)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <Award size={18} color="var(--green)" />
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>YOUR STEWARDSHIP</span>
                     </div>
                     <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#fff' }}>
                       {totalCredits.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--green)', fontWeight: 800 }}>VC</span>
                     </div>
                     <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                       Est. Market Value: <strong style={{ color: '#fff' }}>₹{(totalCredits * 1.18).toFixed(2)}</strong>
                     </div>
                  </div>

                  <div className="vs-glass vs-tilt" style={{ padding: '22px 26px', borderRadius: '24px', borderLeft: '4px solid var(--purple)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <TrendingUp size={18} color="var(--purple)" />
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>NET CARBON EQUIVALENT</span>
                     </div>
                     <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#fff' }}>
                       {totalCo2} <span style={{ fontSize: '0.85rem', color: 'var(--purple)', fontWeight: 800 }}>kg CO2</span>
                     </div>
                     <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                       Equivalent to <strong style={{ color: '#fff' }}>{Math.round(totalCredits / 10)} trees</strong> planted
                     </div>
                  </div>

                  {/* MONETIZE / SELL CREDITS BUTTON */}
                  <div className="vs-glass" style={{ 
                    padding: '22px 20px', borderRadius: '24px', display: 'flex', flexDirection: 'column', 
                    justifyContent: 'center', background: 'linear-gradient(135deg, rgba(0,255,163,0.1), transparent)',
                    border: '1px solid rgba(0,255,163,0.25)'
                  }}>
                     <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--green)', textTransform: 'uppercase', marginBottom: 4 }}>
                       Monetize Surplus
                     </div>
                     <button 
                       className="vs-btn vs-btn-primary" 
                       onClick={() => setShowSellModal(true)}
                       style={{ width: '100%', borderRadius: 14, padding: '12px 14px', fontSize: '0.85rem', fontWeight: 800 }}
                     >
                       <PlusCircle size={15} /> Sell My Credits
                     </button>
                  </div>
               </div>

               {/* OPEN MARKETPLACE BOARD */}
               <div className="vs-glass" style={{ padding: '36px', borderRadius: '32px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ShoppingBag size={24} color="var(--cyan)" />
                        <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800 }}>
                          Open Carbon Credit Exchange
                        </h3>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Peer-to-peer verified renewable energy batches ready for retirement or trading.
                      </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,255,163,0.06)', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(0,255,163,0.2)' }}>
                       <ShieldCheck size={14} color="var(--green)" /> Secured by VahanLedger Consensus
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
                    {[
                      { id: 'ALL', label: 'All Batches' },
                      { id: 'Solar', label: '☀️ Solar PV' },
                      { id: 'V2G', label: '⚡ Fleet V2G' },
                      { id: 'Wind', label: '🌬️ Wind & Hybrid' },
                      { id: 'Freight', label: '🚚 Freight Offset' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setCategoryFilter(tab.id)}
                        style={{
                          padding: '7px 16px',
                          borderRadius: 20,
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          background: categoryFilter === tab.id ? 'var(--cyan)' : 'rgba(255,255,255,0.04)',
                          color: categoryFilter === tab.id ? '#000' : 'var(--text-muted)',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* LISTINGS GRID */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
                    {filteredListings.length > 0 ? filteredListings.map((l) => {
                      const rate = l.unit_price || (l.price_inr / Math.max(l.credits_amount, 1)).toFixed(2);
                      const discount = l.discount_pct || 0;
                      return (
                        <div 
                          key={l.id} 
                          className="feat-card vs-tilt" 
                          style={{ 
                            padding: '24px', 
                            background: 'rgba(255,255,255,0.015)', 
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 24,
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                           {/* Category Badge & Discount */}
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                              <span style={{ 
                                fontSize: '0.62rem', fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                                background: 'rgba(0,240,255,0.1)', color: 'var(--cyan)', textTransform: 'uppercase' 
                              }}>
                                {l.credit_type || 'Clean Energy Batch'}
                              </span>
                              {discount > 0 && (
                                <span style={{ 
                                  fontSize: '0.62rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                                  background: 'rgba(0,255,163,0.1)', color: 'var(--green)' 
                                }}>
                                  -{discount}% below rate
                                </span>
                              )}
                           </div>

                           {/* VC Volume & Price */}
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                              <div style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'Syne, sans-serif', color: '#fff' }}>
                                {l.credits_amount} <span style={{ fontSize: '0.9rem', color: 'var(--cyan)' }}>VC</span>
                              </div>
                              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--green)', fontFamily: 'Syne, sans-serif' }}>
                                ₹{Number(l.price_inr).toLocaleString()}
                              </div>
                           </div>

                           {/* Sub-info: rate & co2 */}
                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                              <span>Rate: <strong style={{ color: '#fff' }}>₹{rate} / VC</strong></span>
                              <span>🍃 {l.co2_kg || (l.credits_amount * 0.15).toFixed(1)} kg CO2</span>
                           </div>

                           {/* Seller Info */}
                           <div style={{ 
                             display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', 
                             background: 'rgba(0,0,0,0.3)', borderRadius: 14, marginBottom: 18,
                             border: '1px solid rgba(255,255,255,0.03)'
                           }}>
                              <div style={{ 
                                width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--cyan), var(--purple))', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#000', fontWeight: 900 
                              }}>
                                 {(l.seller_name || 'V').charAt(0)}
                              </div>
                              <div style={{ overflow: 'hidden' }}>
                                 <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {l.seller_name}
                                 </div>
                                 <div style={{ fontSize: '0.62rem', color: 'var(--cyan)', fontWeight: 600 }}>
                                    {l.seller_badge || 'Verified Generator'}
                                 </div>
                              </div>
                           </div>

                           <button 
                             className="vs-btn vs-btn-primary" 
                             style={{ width: '100%', borderRadius: 14, padding: '11px', fontWeight: 800 }} 
                             onClick={() => buyCredits(l.id, l.seller_name, l.credits_amount, l.price_inr)}
                           >
                              Buy Credits (₹{Number(l.price_inr).toLocaleString()})
                           </button>
                        </div>
                      );
                    }) : (
                      <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                         <ShoppingBag size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
                         <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>No active batches in this category.</div>
                         <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Check another filter or list your own credits above.</div>
                      </div>
                    )}
                  </div>
               </div>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL: ADD FUNDS */}
      {showAddFunds && (
        <div className="vs-modal-overlay" onClick={() => setShowAddFunds(false)}>
          <div className="vs-modal vs-glass" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 32, borderRadius: 28 }}>
            <div className="vs-flex-between" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CreditCard size={22} color="var(--cyan)" />
                <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif', fontSize: '1.35rem', fontWeight: 800 }}>Add Funds to VahanPay</h3>
              </div>
              <button className="vs-btn-icon" onClick={() => setShowAddFunds(false)}><X size={18} /></button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 20 }}>
              Top up your balance instantly for EV charging sessions and carbon credit acquisitions.
            </p>

            <form onSubmit={handleTopup}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Select Preset Amount
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[500, 1000, 2500, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopupAmount(amt)}
                      style={{
                        padding: '10px 6px', borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: topupAmount === amt ? 'var(--cyan)' : 'rgba(255,255,255,0.05)',
                        color: topupAmount === amt ? '#000' : '#fff', fontWeight: 800, fontSize: '0.82rem'
                      }}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Custom Amount (₹ INR)
                </label>
                <input 
                  type="number" 
                  className="vs-input" 
                  min="100" 
                  max="100000" 
                  value={topupAmount} 
                  onChange={e => setTopupAmount(Number(e.target.value))} 
                  required 
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Payment Method
                </label>
                <select className="vs-input" value={topupMethod} onChange={e => setTopupMethod(e.target.value)}>
                  <option value="UPI FastPay">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="NetBanking HDFC/ICICI">Net Banking (HDFC, ICICI, SBI, Axis)</option>
                  <option value="Debit/Credit Card">Corporate EV Fleet Card</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="vs-btn vs-btn-secondary" style={{ flex: 1, borderRadius: 14 }} onClick={() => setShowAddFunds(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isTopupLoading} className="vs-btn vs-btn-primary" style={{ flex: 1.5, borderRadius: 14 }}>
                  {isTopupLoading ? 'Authorizing...' : `Pay ₹${topupAmount.toLocaleString()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFER / PAYOUT */}
      {showTransfer && (
        <div className="vs-modal-overlay" onClick={() => setShowTransfer(false)}>
          <div className="vs-modal vs-glass" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 32, borderRadius: 28 }}>
            <div className="vs-flex-between" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ArrowUpRight size={22} color="var(--green)" />
                <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif', fontSize: '1.35rem', fontWeight: 800 }}>Withdraw / Payout</h3>
              </div>
              <button className="vs-btn-icon" onClick={() => setShowTransfer(false)}><X size={18} /></button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 20 }}>
              Transfer liquid earnings from carbon credit sales directly to your bank account or UPI ID.
            </p>

            <form onSubmit={handleTransfer}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Withdrawal Amount (Available: ₹{(wallet.balance || 0).toLocaleString()})
                </label>
                <input 
                  type="number" 
                  className="vs-input" 
                  min="50" 
                  max={wallet.balance || 0} 
                  value={transferAmount} 
                  onChange={e => setTransferAmount(Number(e.target.value))} 
                  required 
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Destination UPI ID / Account
                </label>
                <input 
                  type="text" 
                  className="vs-input" 
                  placeholder="e.g. yourname@okhdfcbank" 
                  value={transferTarget} 
                  onChange={e => setTransferTarget(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="vs-btn vs-btn-secondary" style={{ flex: 1, borderRadius: 14 }} onClick={() => setShowTransfer(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isTransferLoading} className="vs-btn vs-btn-primary" style={{ flex: 1.5, borderRadius: 14 }}>
                  {isTransferLoading ? 'Processing IMPS...' : `Transfer ₹${transferAmount.toLocaleString()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SELL CREDITS ON MARKETPLACE */}
      {showSellModal && (
        <div className="vs-modal-overlay" onClick={() => setShowSellModal(false)}>
          <div className="vs-modal vs-glass" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, padding: 32, borderRadius: 28 }}>
            <div className="vs-flex-between" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Tag size={22} color="var(--green)" />
                <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif', fontSize: '1.35rem', fontWeight: 800 }}>List Credits for Sale</h3>
              </div>
              <button className="vs-btn-icon" onClick={() => setShowSellModal(false)}><X size={18} /></button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 20 }}>
              Offer your earned VahanCredits to corporate fleets and ESG buyers on the Open Exchange.
            </p>

            <form onSubmit={handleSellCredits}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Credits to Sell (You have: {totalCredits} VC)
                </label>
                <input 
                  type="number" 
                  className="vs-input" 
                  min="1" 
                  max={totalCredits} 
                  value={sellCredits} 
                  onChange={e => {
                    const c = Number(e.target.value);
                    setSellCredits(c);
                    setSellPrice(Math.round(c * 1.18));
                  }} 
                  required 
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Total Asking Price (₹ INR) · Rec: ₹{(sellCredits * 1.18).toFixed(0)} (₹1.18/VC)
                </label>
                <input 
                  type="number" 
                  className="vs-input" 
                  min="1" 
                  value={sellPrice} 
                  onChange={e => setSellPrice(Number(e.target.value))} 
                  required 
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Clean Energy Origin
                </label>
                <select className="vs-input" value={sellType} onChange={e => setSellType(e.target.value)}>
                  <option value="Clean EV Mobility Batch">Clean EV Driving (Low-Carbon Corridor)</option>
                  <option value="Solar PV Microgrid">Rooftop Solar Fast Charging</option>
                  <option value="Fleet V2G Regeneration">Vehicle-to-Grid (V2G) Peak Feed</option>
                </select>
              </div>

              <div style={{ 
                padding: '12px 14px', borderRadius: 12, background: 'rgba(0,255,163,0.06)', 
                border: '1px solid rgba(0,255,163,0.2)', marginBottom: 24, fontSize: '0.75rem', color: 'var(--text-muted)' 
              }}>
                Upon buyer acquisition, <strong style={{ color: '#fff' }}>₹{sellPrice}</strong> will be deposited instantly into your VahanPay balance.
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="vs-btn vs-btn-secondary" style={{ flex: 1, borderRadius: 14 }} onClick={() => setShowSellModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isSelling} className="vs-btn vs-btn-primary" style={{ flex: 1.5, borderRadius: 14 }}>
                  {isSelling ? 'Listing...' : `Publish ${sellCredits} VC Listing`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .vs-spin-slow { animation: vs-spin 10s linear infinite; }
        @keyframes vs-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
