import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function HelpPage() {
  const navigate = useNavigate();

  // Redirect to the new Documentation page
  useEffect(() => {
    navigate('/documentation', { replace: true });
  }, [navigate]);

  return null; // This page just redirects
}