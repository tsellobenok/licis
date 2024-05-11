import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { createTheme, MantineProvider } from '@mantine/core';
import { RecoilRoot } from 'recoil';

import { Home } from './routes/home';

import '@mantine/core/styles.css';
import './App.css';

const theme = createTheme({
  defaultRadius: 'md',
});

export default function App() {
  return (
    <RecoilRoot>
      <MantineProvider theme={theme}>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </Router>
      </MantineProvider>
    </RecoilRoot>
  );
}
