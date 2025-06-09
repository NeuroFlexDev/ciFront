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
import AuthPage from './Pages/AuthPage/AuthPage';
import MainLayout from './Pages/MainLayot/MainLayot';
import RegistrationPage from './Pages/RegistrationPage/RegistrationPage';

function App() {

  return (
    <>
    <BrowserRouter basename='/'>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<MainPage />} />
          <Route path="/ai-helper" element={<AiHelperPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/express" element={<ExpressPage />} />
          <Route path="/courses" element={<MyCoursesPage />} />
          <Route path="/courses/:id/edit" element={<CourseEditPage />} />
          <Route path="/500" element={<ServerError />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/auth" element={<AuthPage />} />
        <Route path="/registration" element={<RegistrationPage />} />
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
