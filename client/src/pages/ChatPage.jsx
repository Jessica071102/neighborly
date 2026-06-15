import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ChevronLeftIcon, SendIcon } from '../components/Icons';

function timeLabel(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [messages, setMessages] = useState([]);
  const [request, setRequest] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/requests/mine'),
      api.get(`/messages/${requestId}`),
    ]).then(([reqData, msgData]) => {
      const found = reqData.requests.find((r) => String(r.id) === String(requestId));
      setRequest(found || null);
      setMessages(msgData.messages);
    }).catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [requestId]);

  useEffect(() => {
    if (!token) return;
    const socket = io({ auth: { token } });
    socketRef.current = socket;

    socket.emit('join', Number(requestId));

    socket.on('message', (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => socket.disconnect();
  }, [requestId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    const content = text.trim();
    if (!content || !socketRef.current) return;
    socketRef.current.emit('message', { requestId: Number(requestId), content });
    setText('');
    textareaRef.current?.focus();
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (loading) return <div className="loading"><div className="spinner" />Loading…</div>;
  if (error) return <div className="container"><div className="error-box">{error}</div></div>;

  return (
    <div className="chat-wrap">
      <div className="chat-header">
        <button className="btn btn-ghost btn-sm" style={{ padding: '6px 10px' }} onClick={() => navigate('/requests')}>
          <ChevronLeftIcon size={18} />
        </button>
        <div className="chat-header-info">
          <div className="chat-header-title">
            {request ? request.item_name : `Request #${requestId}`}
          </div>
          {request && (
            <div className="chat-header-sub">
              {new Date(request.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' → '}
              {new Date(request.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' · '}
              <span style={{ textTransform: 'capitalize' }}>{request.status}</span>
            </div>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginTop: 40 }}>
            No messages yet. Say hi!
          </div>
        )}
        {messages.map((msg) => {
          const mine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`chat-message ${mine ? 'chat-message-mine' : 'chat-message-other'}`}>
              {!mine && <div className="chat-sender">{msg.sender_name}</div>}
              <div className="chat-bubble">{msg.content}</div>
              <div className="chat-time">{timeLabel(msg.created_at)}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
        />
        <button
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={!text.trim()}
          title="Send"
        >
          <SendIcon size={18} />
        </button>
      </div>
    </div>
  );
}
