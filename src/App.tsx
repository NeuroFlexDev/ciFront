import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import MainPage from './Pages/MainPage/MainPage';
import AiHelperPage from './Pages/AiHelperPage/AiHelperPage'
import TemplatesPage from './Pages/TemplatesPage/TemplatesPage'
import ExpressPage from './Pages/ExpressPage/ExpressPage'
import MyCoursesPage from './Pages/MyCourses/MyCourses';

function App() {

  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage/>} />
        <Route path="/ai-helper" element={<AiHelperPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/express" element={<ExpressPage />} />
        <Route path="/courses" element={<MyCoursesPage />} />
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
