import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ChevronLeftIcon, SendIcon, TrashIcon } from '../components/Icons';

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
  const [swipedId, setSwipedId] = useState(null);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const swipeStartX = useRef(0);
  const justSwipedRef = useRef(false);

  useEffect(() => {
    Promise.all([
      api.get('/requests/mine'),
      api.get(`/messages/${requestId}`),
    ]).then(([reqData, msgData]) => {
      const found = reqData.requests.find((r) => String(r.id) === String(requestId));
      setRequest(found || null);
      setMessages(msgData.messages);
      // Mark notifications for this chat as read and refresh the badge
      api.put(`/notifications/read-by-request/${requestId}`, {})
        .then(() => window.dispatchEvent(new CustomEvent('notif-refresh')))
        .catch(() => {});
    }).catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [requestId]);

  useEffect(() => {
    if (!token) return;
    const socket = io(import.meta.env.VITE_API_BASE_URL || undefined, { auth: { token } });
    socketRef.current = socket;

    socket.emit('join', Number(requestId));

    socket.on('message', (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('message_deleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
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

  async function handleDelete(msgId) {
    // Optimistic remove
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    setSwipedId(null);
    try {
      await api.delete(`/messages/${msgId}`);
      // Notify the other participant's open chat via socket
      socketRef.current?.emit('delete_message', { messageId: msgId });
    } catch {
      // Restore on failure by re-fetching
      const data = await api.get(`/messages/${requestId}`).catch(() => null);
      if (data) setMessages(data.messages);
    }
  }

  function onTouchStart(e, msgId) {
    swipeStartX.current = e.touches[0].clientX;
    // close any other open swipe
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
