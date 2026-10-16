import { Navigate, Route, Routes } from 'react-router-dom';

import { EventDetail } from './routes/EventDetail';
import { EventsPage } from './routes/EventsPage';

/**
 * The detail route is nested under the list, so opening /events/3 keeps the
 * list rendered underneath and the modal is a layer on top of it rather
 * than a separate screen.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EventsPage />}>
        <Route path="events/:id" element={<EventDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
