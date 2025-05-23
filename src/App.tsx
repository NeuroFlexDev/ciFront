import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import MainPage from './Pages/MainPage/MainPage';
import AiHelperPage from './Pages/AiHelperPage/AiHelperPage'
import TemplatesPage from './Pages/TemplatesPage/TemplatesPage'
import ExpressPage from './Pages/ExpressPage/ExpressPage'
import MyCoursesPage from './Pages/MyCourses/MyCourses';
import CourseEditPage from './Components/CourseEditPage/CourseEditPage';
import NotFoundPage from './Pages/NotFound/NotFound';
import ServerError from './Pages/ServerError/ServerError';

function App() {

  return (
    <>
    <BrowserRouter basename='/'>
      <Routes>
        <Route path="/" element={<MainPage/>} />
        <Route path="/ai-helper" element={<AiHelperPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/express" element={<ExpressPage />} />
        <Route path="/courses" element={<MyCoursesPage />} />
        <Route path="/courses/:id/edit" element={<CourseEditPage />} />
        <Route path="/500" element={<ServerError />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
