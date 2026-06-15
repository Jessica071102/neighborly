import { Link } from 'react-router-dom';
import { PackageIcon, MapPinIcon } from './Icons';

export default function ListingCard({ item }) {
  return (
    <Link to={`/items/${item.id}`} className="listing-card">
      {item.photo_url ? (
        <img className="listing-card-img" src={item.photo_url} alt={item.name} />
      ) : (
        <div className="listing-card-img-placeholder">
          <PackageIcon size={36} />
        </div>
      )}
      <div className="listing-card-body">
        <div className="listing-card-name">{item.name}</div>
        <div className="listing-card-meta">
          <span>{item.category}</span>
          {item.distanceKm != null && (
            <>
              <span className="listing-card-meta-dot" />
              <MapPinIcon size={12} />
              <span>{item.distanceKm} km</span>
            </>
          )}
          {item.owner_area && (
            <>
              <span className="listing-card-meta-dot" />
              <span>{item.owner_area}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
