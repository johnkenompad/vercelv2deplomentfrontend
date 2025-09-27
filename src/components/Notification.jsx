import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';

const NotificationContext = createContext(null);

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within <NotificationProvider>');
  return {
    showNotification: (type, message, duration = 3000) => {
      ctx.notify({
        type,
        title:
          type === 'success'
            ? 'Success!'
            : type === 'error'
            ? 'Error!'
            : type === 'warning'
            ? 'Warning!'
            : 'Info',
        message,
        duration,
      });
    },
  };
}

let _id = 0;
const nextId = () => (++_id).toString();

const TYPE_STYLES = {
  success: {
    ring: 'ring-green-300',
    bg: 'bg-white',
    title: 'text-green-700',
    text: 'text-green-600',
    bar: 'bg-green-500',
    icon: (
      <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 10.435a1 1 0 111.414-1.414l3.222 3.222 6.657-6.657a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
  },
  error: {
    ring: 'ring-red-300',
    bg: 'bg-white',
    title: 'text-red-700',
    text: 'text-red-600',
    bar: 'bg-red-500',
    icon: (
      <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.5a.75.75 0 00-1.5 0v4a.75.75 0 001.5 0v-4zm0 6.5a.75.75 0 10-1.5 0 .75.75 0 001.5 0z" clipRule="evenodd" />
      </svg>
    ),
  },
  info: {
    ring: 'ring-blue-300',
    bg: 'bg-white',
    title: 'text-blue-700',
    text: 'text-blue-600',
    bar: 'bg-blue-500',
    icon: (
      <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 9h2v6H9V9zM9 5h2v2H9V5z" />
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16z" clipRule="evenodd" />
      </svg>
    ),
  },
  warning: {
    ring: 'ring-amber-300',
    bg: 'bg-white',
    title: 'text-amber-700',
    text: 'text-amber-600',
    bar: 'bg-amber-500',
    icon: (
      <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8.257 3.099c.765-1.36 2.721-1.36 3.486 0l6.518 11.59c.75 1.335-.213 2.996-1.743 2.996H3.482c-1.53 0-2.493-1.66-1.743-2.996L8.257 3.1zM9 7h2v5H9V7zm0 6h2v2H9v-2z" />
      </svg>
    ),
  },
};

const cardBase = `transition-opacity duration-300 opacity-100 animate-fade-in pointer-events-auto w-80 sm:w-96 ring-1 rounded-2xl shadow-xl p-4 pr-5 backdrop-blur bg-white`;

function Toast({ toast, onClose }) {
  const { id, title, message, type, duration = 3000 } = toast;
  const styles = TYPE_STYLES[type] || TYPE_STYLES.info;
  const [hover, setHover] = useState(false);
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());
  const elapsedRef = useRef(0);

  useEffect(() => {
    let raf;
    const tick = () => {
      if (!hover) {
        const elapsed = Date.now() - startRef.current + elapsedRef.current;
        const pct = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(pct);
        if (elapsed >= duration) return onClose(id);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hover, duration, id, onClose]);

  return (
    <div
      className={`${cardBase} ${styles.ring}`}
      onMouseEnter={() => {
        setHover(true);
        elapsedRef.current += Date.now() - startRef.current;
      }}
      onMouseLeave={() => {
        setHover(false);
        startRef.current = Date.now();
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{styles.icon}</div>
        <div className="flex-1 min-w-0">
          {title && <h4 className={`font-semibold ${styles.title}`}>{title}</h4>}
          {message && <p className={`mt-0.5 text-sm ${styles.text}`}>{message}</p>}
        </div>
        <button
          onClick={() => onClose(id)}
          className="ml-2 inline-flex items-center justify-center h-7 w-7 rounded-full hover:bg-[#F6EFFC] transition"
        >
          <svg className="h-4 w-4 text-[#974EC3]" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293A1 1 0 014.293 14.293L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      <div className="mt-3 h-1 w-full rounded-full bg-[#F6EFFC]">
        <div
          className={`h-1 rounded-full transition-all ease-linear ${styles.bar}`}
          style={{ width: `${progress}%`, backgroundColor: '#B76EF1' }}
        />
      </div>
    </div>
  );
}

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const close = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback((opts) => {
    const { title = '', message = '', type = 'info', duration = 3000 } = opts || {};
    const id = nextId();
    setToasts((prev) => [
      ...prev,
      { id, title, message, type, duration, createdAt: Date.now() },
    ]);
    return id;
  }, []);

  const value = useMemo(() => ({ notify, close }), [notify, close]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[9999] flex flex-col items-end p-4 gap-3 sm:p-6">
        <div className="flex flex-col gap-3 w-full items-end sm:max-w-md">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onClose={close} />
          ))}
        </div>
      </div>
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;
