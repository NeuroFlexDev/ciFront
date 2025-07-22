import Menu from '@/Components/Menu/Menu';
import AiChat from '@/Components/AiHelperPage/Chat/Chat';

function AiHelperPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Menu />
      <div style={{ flex: 1 }}>
        <AiChat />
      </div>
    </div>
  );
}
export default AiHelperPage;
