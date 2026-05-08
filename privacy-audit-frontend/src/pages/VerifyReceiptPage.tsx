import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ShieldIcon, CheckIcon } from '../components/icons/Icons';

interface ReceiptData {
  hash: string;
  action: string;
  dataType: string;
  userId: string;
  tenantId: string;
  timestamp: string;
  granted: boolean;
}

export default function VerifyReceiptPage() {
  const { hash } = useParams<{ hash: string }>();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hash) return;
    setLoading(true);
    api.get(`/verify/${hash}`)  // public, no auth header needed
      .then(r => { setReceipt(r.data); setLoading(false); })
      .catch(() => { setError('Receipt not found or hash is invalid.'); setLoading(false); });
  }, [hash]);

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--accent), var(--brand))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 28px var(--accent-glow)',
          }}>
            <ShieldIcon style={{ width: 28, height: 28, color: '#fff' }} />
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>
            DataGuard Receipt Verifier
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
            Cryptographically verify a consent or deletion receipt
          </p>
        </div>

        {/* Hash display */}
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 20, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-2)', wordBreak: 'break-all' }}>
          <span style={{ color: 'var(--text-3)', marginRight: 8 }}>Hash:</span>{hash}
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            Verifying receipt…
          </div>
        ) : error ? (
          <div style={{ padding: '24px', borderRadius: 14, background: 'var(--red-dim)', border: '1px solid rgba(220,38,38,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>Verification Failed</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{error}</div>
          </div>
        ) : receipt ? (
          <div style={{ borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
            {/* Verified banner */}
            <div style={{ padding: '16px 20px', background: 'var(--green-dim)', borderBottom: '1px solid rgba(5,150,105,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckIcon style={{ width: 14, height: 14, color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>Receipt Verified ✓</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>This record is authentic and unmodified</div>
              </div>
            </div>

            {/* Details */}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Action', value: receipt.action },
                  { label: 'Data Type', value: receipt.dataType },
                  { label: 'Status', value: receipt.granted ? 'Consent Granted' : 'Consent Withdrawn' },
                  { label: 'Timestamp', value: new Date(receipt.timestamp).toLocaleString('en-IE', { dateStyle: 'long', timeStyle: 'medium' }) },
                  { label: 'User ID', value: receipt.userId },
                  { label: 'Tenant', value: receipt.tenantId },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', gap: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', minWidth: 90 }}>{row.label}</span>
                    <span style={{ fontSize: 13, color: 'var(--text)', flex: 1, fontFamily: row.label === 'User ID' || row.label === 'Tenant' ? "'JetBrains Mono', monospace" : 'inherit', wordBreak: 'break-all' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>SHA-256 Hash</div>
                <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-2)', wordBreak: 'break-all' }}>{receipt.hash}</div>
              </div>

              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
                This receipt was generated under <strong>GDPR Article 7</strong> (Conditions for Consent). It serves as verifiable proof of a consent preference recorded in DataGuard.
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'var(--text-3)' }}>
          Powered by <strong style={{ color: 'var(--accent)' }}>DataGuard Privacy Audit</strong>
        </div>
      </div>
    </div>
  );
}
