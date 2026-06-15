import { StarIcon } from './Icons';

export default function StarRating({ value = 0, onChange, size = 20 }) {
  const interactive = !!onChange;
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star-btn${value >= n ? ' filled' : ''}`}
          onClick={interactive ? () => onChange(n) : undefined}
          style={{ cursor: interactive ? 'pointer' : 'default' }}
          tabIndex={interactive ? 0 : -1}
        >
          <StarIcon filled={value >= n} size={size} />
        </button>
      ))}
    </div>
  );
}
