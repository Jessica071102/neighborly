import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ChevronLeftIcon, SendIcon, TrashIcon } from '../components/Icons';

const POLL_INTERVAL = 4000; // ms

function timeLabel(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [request, setRequest] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [swipedId, setSwipedId] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const swipeStartX = useRef(0);
  const justSwipedRef = useRef(false);

  // Initial load
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

  // Short-poll for new messages every 4 s
  useEffect(() => {
    const id = setInterval(async () => {
      const data = await api.get(`/messages/${requestId}`).catch(() => null);
      if (data) setMessages(data.messages);
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const content = text.trim();
    if (!content) return;
    setSendError('');

    // Optimistic append
    const tmp = {
      id: `tmp-${Date.now()}`,
      sender_id: user?.id,
      sender_name: user?.display_name,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tmp]);
    setText('');
    textareaRef.current?.focus();

    try {
      await api.post(`/messages/${requestId}`, { content });
      // Refresh to get the server-assigned id and timestamp
      const data = await api.get(`/messages/${requestId}`);
      setMessages(data.messages);
    } catch (err) {
      setSendError(err.message);
      setMessages((prev) => prev.filter((m) => m.id !== tmp.id));
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function handleDelete(msgId) {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    setSwipedId(null);
    try {
      await api.delete(`/messages/${msgId}`);
    } catch {
      // Restore on failure
      const data = await api.get(`/messages/${requestId}`).catch(() => null);
      if (data) setMessages(data.messages);
    }
  }

  function onTouchStart(e, msgId) {
    swipeStartX.current = e.touches[0].clientX;
    if (swipedId && swipedId !== msgId) setSwipedId(null);
  }

  function onTouchEnd(e, msgId) {
    const delta = e.changedTouches[0].clientX - swipeStartX.current;
    if (delta < -50) {
      justSwipedRef.current = true;
      setTimeout(() => { justSwipedRef.current = false; }, 300);
      setSwipedId(msgId);
    } else if (delta > 20) {
      setSwipedId(null);
    }
  }

  if (loading) return <div className="loading"><div className="spinner" />Loading…</div>;
  if (error) return <div className="container"><div className="error-box">{error}</div></div>;

  return (
    <div className="chat-wrap" onClick={() => { if (!justSwipedRef.current) setSwipedId(null); }}>
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
          const swiped = swipedId === msg.id;
          return (
            <div
              key={msg.id}
              className={`chat-msg-wrap${mine ? ' mine' : ''}`}
              onTouchStart={mine ? (e) => { e.stopPropagation(); onTouchStart(e, msg.id); } : undefined}
              onTouchEnd={mine ? (e) => { e.stopPropagation(); onTouchEnd(e, msg.id); } : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`chat-message ${mine ? 'chat-message-mine' : 'chat-message-other'}`}
                style={mine ? {
                  transform: swiped ? 'translateX(-70px)' : 'translateX(0)',
                  transition: 'transform 0.2s ease',
                } : {}}
              >
                {!mine && <div className="chat-sender">{msg.sender_name}</div>}
                <div className="chat-bubble">{msg.content}</div>
                <div className="chat-time">{timeLabel(msg.created_at)}</div>
              </div>

              {mine && (
                <>
                  <button
                    className={`msg-delete-btn${swiped ? ' visible' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                    title="Delete message"
                  >
                    <TrashIcon size={16} />
                  </button>
                  <button
                    className="msg-delete-hover"
                    onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                    title="Delete message"
                  >
                    <TrashIcon size={12} />
                  </button>
                </>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <div style={{ padding: '6px 16px', background: 'var(--error-bg)', color: 'var(--error)', fontSize: 13, textAlign: 'center' }}>
          {sendError}
        </div>
      )}

      <div className="chat-input-area" onClick={(e) => e.stopPropagation()}>
        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          maxLength={1000}
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
