import { useEffect } from 'react';
import { useNavigate } from 'react-router'

const IndexPage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/threads");
  }, [navigate]);

  return null
}

export default IndexPage