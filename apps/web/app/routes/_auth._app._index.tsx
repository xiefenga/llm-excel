import { useNavigate } from 'react-router'

const IndexPage = () => {
  const navigate = useNavigate();
  navigate("/threads");
}

export default IndexPage