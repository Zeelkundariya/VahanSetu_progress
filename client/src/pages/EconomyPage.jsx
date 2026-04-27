import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { api, showToast } from '../api';
import { 
  CreditCard, Zap, ArrowUpRight, ArrowDownRight, 
  ShoppingBag, TrendingUp, Globe, ShieldCheck,
  Award, Wallet, RefreshCw
} from 'lucide-react';

export default function EconomyPage() {
  const [wallet, setWallet] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState({ total_balance: 0 });

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
      setListings(marketRes.data);
      setCredits(creditsRes.data);
      setLoading(false);
    } catch (err) {
      showToast("Economy Stream Sync Failed", "error");
    }
  };

  const buyCredits = async (listingId) => {
    try {
      await api.post(`/api/marketplace/buy/${listingId}`);
      showToast("VahanCredits Acquired!", "success");
      fetchEconomyData();
    } catch (err) {
      showToast(err.response?.data?.error || "Transaction Failed", "error");
    }
  };

  if (loading) return (
    <div className="vs-loading-wrap">
      <div className="vs-spin"></div>
    </div>
  );

  return (
    <div className="app">
      <Navbar />
      <div className="page-wrapper">
        <div className="page-content">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
            <div>
              <div className="eyebrow" style={{ animationDelay: '0s' }}>
                <div className="eyebrow-dot"></div> Financial Stewardship
              </div>
              <h1 className="hero-title" style={{ fontSize: '3.5rem', marginBottom: 0 }}>VahanSetu <span className="accent">Economy</span></h1>
            </div>
            <div style={{ textAlign: 'right' }}>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 8 }}>PLATFORM RATE</div>
               <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--green)' }}>₹1.25 / Credit</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
            
            {/* LEFT: VAHANPAY WALLET */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div className="vs-glass" style={{ 
                padding: '40px', 
                borderRadius: '32px', 
                background: 'linear-gradient(135deg, rgba(0,240,255,0.1), rgba(181,109,255,0.1))',
                border: '1px solid rgba(255,255,255,0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: 0, right: 0, padding: 20 }}>
                  <Wallet size={32} color="var(--cyan)" style={{ opacity: 0.3 }} />
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Available VahanPay Balance</div>
                <div style={{ fontSize: '4rem', fontWeight: 800, fontFamily: 'Syne', letterSpacing: '-2px' }}>₹{wallet.balance.toLocaleString()}</div>
                
                <div style={{ display: 'flex', gap: 15, marginTop: 30 }}>
                  <button className="vs-btn vs-btn-primary" style={{ flex: 1, borderRadius: 16 }}>
                    <CreditCard size={18} /> Add Funds
                  </button>
                  <button className="vs-btn" style={{ flex: 1, borderRadius: 16, background: 'rgba(255,255,255,0.05)' }}>
                    <ArrowUpRight size={18} /> Transfer
                  </button>
                </div>
              </div>

              <div className="vs-glass" style={{ padding: '30px', borderRadius: '32px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Recent Activity</h3>
                    <RefreshCw size={16} className="vs-spin-slow" color="var(--text-muted)" />
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                    {wallet.history.map((tx, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 16 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: tx.type === 'credit' ? 'rgba(0,255,163,0.1)' : 'rgba(255,61,107,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tx.type === 'credit' ? 'var(--green)' : 'var(--red)' }}>
                             {tx.type === 'credit' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{tx.description}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(tx.timestamp).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, color: tx.type === 'credit' ? 'var(--green)' : '#fff' }}>
                          {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            {/* RIGHT: CARBON MARKETPLACE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="vs-glass" style={{ padding: '24px', borderRadius: '24px', borderLeft: '4px solid var(--green)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <Award size={18} color="var(--green)" />
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>YOUR STEWARDSHIP</span>
                     </div>
                     <div style={{ fontSize: '2rem', fontWeight: 800 }}>{credits.total_balance} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>CREDITS</span></div>
                  </div>
                  <div className="vs-glass" style={{ padding: '24px', borderRadius: '24px', borderLeft: '4px solid var(--purple)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <TrendingUp size={18} color="var(--purple)" />
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>ECO EQUIVALENT</span>
                     </div>
                     <div style={{ fontSize: '2rem', fontWeight: 800 }}>{(credits.total_balance * 0.15).toFixed(1)} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>kg CO2</span></div>
                  </div>
               </div>

               <div className="vs-glass" style={{ padding: '40px', borderRadius: '32px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ShoppingBag size={24} color="var(--cyan)" />
                      <h3 style={{ margin: 0, fontFamily: 'Syne', fontSize: '1.5rem' }}>Open Marketplace</h3>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                       <ShieldCheck size={14} color="var(--green)" /> Secured by VahanLedger
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {listings.length > 0 ? listings.map((l) => (
                      <div key={l.id} className="feat-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--cyan)' }}>{l.credits_amount} VC</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>₹{l.price_inr}</div>
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#000', fontWeight: 900 }}>
                               {l.seller_name.charAt(0)}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sold by {l.seller_name}</span>
                         </div>
                         <button className="vs-btn vs-btn-primary" style={{ width: '100%', borderRadius: 12, padding: '10px' }} onClick={() => buyCredits(l.id)}>
                            Buy Now
                         </button>
                      </div>
                    )) : (
                      <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                         <Globe size={48} style={{ opacity: 0.1, marginBottom: 20 }} />
                         <div>No active listings in your region.</div>
                         <div style={{ fontSize: '0.8rem' }}>Check back soon for stewardship opportunities.</div>
                      </div>
                    )}
                  </div>
               </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        .vs-spin-slow { animation: vs-spin 10s linear infinite; }
        @keyframes vs-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
