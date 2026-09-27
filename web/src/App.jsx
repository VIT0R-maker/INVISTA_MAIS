import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProvedorAuth, useAuth } from './auth';
import Layout from './componentes/Layout';
import Cofrinhos from './paginas/Cofrinhos';
import Entrar from './paginas/Entrar';
import Favoritos from './paginas/Favoritos';
import Painel from './paginas/Painel';
import Scanner from './paginas/Scanner';

const Estatisticas = lazy(() => import('./paginas/Estatisticas'));
const Simulacao = lazy(() => import('./paginas/Simulacao'));

function Protegida({ children }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <p className="aviso centro">Carregando...</p>;
  return usuario ? children : <Navigate to="/entrar" replace />;
}

export default function App() {
  return (
    <ProvedorAuth>
      <BrowserRouter>
        <Suspense fallback={<p className="aviso centro">Carregando...</p>}>
          <Routes>
            <Route path="/entrar" element={<Entrar />} />
            <Route element={<Protegida><Layout /></Protegida>}>
              <Route index element={<Cofrinhos />} />
              <Route path="cofrinhos/:id" element={<Painel />} />
              <Route path="cofrinhos/:id/estatisticas" element={<Estatisticas />} />
              <Route path="cofrinhos/:id/simulacao" element={<Simulacao />} />
              <Route path="scanner" element={<Scanner />} />
              <Route path="favoritos" element={<Favoritos />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ProvedorAuth>
  );
}
