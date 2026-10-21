import styles from './workspace.module.css';
export {Shell,Stat,CopyLink} from './WorkspaceComponents';
export { styles };
export const errorText=(e:unknown)=>e instanceof Error?e.message:'Не удалось выполнить запрос';
export function dateText(s:string){return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(s)?s:s+'Z').toLocaleString('ru-RU');}
export const statuses:Record<string,string>={queued:'В очереди',running:'В работе',paused:'Приостановлен',failed:'Ошибка',succeeded:'Завершён',completed:'Завершён',draft:'Черновик',configured:'Настроен',generating:'Генерация',ready:'Готов',generation_failed:'Ошибка генерации',published:'Опубликован',pending:'Ожидает входа',accepted:'Принято',revoked:'Отозвано',expired:'Истекло'};
export type Overview={metrics:{courses:number;published:number;documents:number;runs:number;completed:number;failed:number;active:number;input_tokens:number;output_tokens:number;cached_tokens:number;known_cost_usd:number|null};courses:{id:number;title:string|null;status:string;publication_status:string}[];runs:{id:number;course_id:number|null;status:string;progress_percent:number;stage:string;created_at:string;error_message:string|null}[];daily:{date:string;count:number}[]};
