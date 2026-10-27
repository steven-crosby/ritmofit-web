import { createRoot } from 'react-dom/client';
import { Root } from './Root';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(<Root />);
