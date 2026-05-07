import AIChatPanel from './AIChatPanel';

export default function AIChatPage() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'stretch',
      background: '#0a0a0c',
      maxWidth: 820,
      margin: '0 auto',
      padding: '20px 24px',
    }}>
      <AIChatPanel mode="page" />
    </div>
  );
}
