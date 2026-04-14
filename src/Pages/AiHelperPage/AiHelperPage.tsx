import { useState } from "react";
import ImageEditor from "@/Components/ElementUi/ImageEditor/ImageEditor";
import TextEditor from "@/Components/ElementUi/TextEditor/TextEditor";
import Menu from "@/Components/Menu/Menu";


function AiHelperPage() {
  const [content, setContent] = useState("");

  return (
    <>
      <Menu />
      <h1>AI-Помощник</h1>
      <TextEditor value={content} onChange={setContent} />
      <ImageEditor />
    </>
  )
}

export default AiHelperPage;
