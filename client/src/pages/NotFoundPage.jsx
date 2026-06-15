import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="notfound-page">
      <div className="notfound-inner">
        <div className="notfound-code">404</div>
        <h1 className="notfound-title">Page not found</h1>
        <p className="notfound-body">
          This page doesn't exist or has been moved.
        </p>
        <Link to={user ? '/search' : '/'} className="btn btn-primary btn-lg">
          {user ? 'Back to search' : 'Go to homepage'}
        </Link>
      </div>
    </div>
  );
}
