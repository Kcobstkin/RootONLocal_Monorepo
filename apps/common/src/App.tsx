import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <h1 className="text-2xl font-bold text-center py-8">Local Control</h1>
        <p className="text-center text-gray-500">앱이 성공적으로 로드되었습니다.</p>
      </div>
    </BrowserRouter>
  );
}

export default App;
