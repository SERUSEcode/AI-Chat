import { useState, useRef, useEffect } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'smollm2:135m',
          messages: [...messages, userMsg],
          stream: true,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              const newText = json.message.content;
              setMessages((prev) => {
                const newMsgs = [...prev];
                const lastIdx = newMsgs.length - 1;
                newMsgs[lastIdx] = { 
                  ...newMsgs[lastIdx], 
                  content: newMsgs[lastIdx].content + newText 
                };
                return newMsgs;
              });
            }
          } catch (e) {
            console.error("Stream parse error", e);
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection Error' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>Fedora AI</h2>
        <span style={styles.badge}>smollm2</span>
      </header>
      <div style={styles.chatArea}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            ...styles.bubble,
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: msg.role === 'user' ? '#2563eb' : '#27272a'
          }}>
            {msg.content}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSubmit} style={styles.inputArea}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message..."
        />
        <button type="submit" disabled={isTyping} style={styles.button}>
          {isTyping ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#09090b', color: '#fff', fontFamily: 'sans-serif' },
  header: { padding: '1rem', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '1rem', color: '#60a5fa' },
  badge: { fontSize: '0.7rem', backgroundColor: '#064e3b', color: '#4ade80', padding: '2px 8px', borderRadius: '10px' },
  chatArea: { flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  bubble: { maxWidth: '80%', padding: '0.8rem', borderRadius: '12px', whiteSpace: 'pre-wrap' },
  inputArea: { padding: '1rem', display: 'flex', gap: '0.5rem', backgroundColor: '#18181b' },
  input: { flex: 1, padding: '0.5rem', borderRadius: '5px', border: '1px solid #3f3f46', backgroundColor: '#27272a', color: '#fff' },
  button: { padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }
};

export default App;
