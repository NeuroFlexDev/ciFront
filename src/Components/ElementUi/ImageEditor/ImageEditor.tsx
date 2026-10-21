import ImageLibrary from './ImageLibrary';
export default function ImageEditor({courseId,onInsert}:{courseId?:number|string;onInsert?:(markdown:string)=>void}) {
  if(!courseId)return <p>Сначала выберите курс, чтобы сохранять и проверять его иллюстрации.</p>;
  return <ImageLibrary courseId={courseId} onInsert={onInsert}/>;
}
