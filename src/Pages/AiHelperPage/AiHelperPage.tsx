import AiChat from "@/Components/AiHelperPage/Chat/Chat";
import Menu from "@/Components/Menu/Menu";


function AiHelperPage() {

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '90vh' }}>
      <Menu />
      <div style={{ flex: 1 }}>
        <AiChat />
      </div>
    </div>
  )
}

export default AiHelperPage;
