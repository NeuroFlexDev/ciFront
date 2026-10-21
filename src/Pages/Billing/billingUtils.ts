export function amountMinor(value:string):number {
  if(!/^\d{1,10}([.,]\d{1,2})?$/.test(value.trim()))throw new Error('Введите положительную сумму с точностью до копейки.');
  const [whole,fraction='']=value.trim().replace(',','.').split('.');
  const result=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(result<=0||result>100000000000)throw new Error('Сумма должна быть больше нуля и не превышать 1 миллиард.');
  return result;
}
export function dateInput(value:string|null|undefined){return value?value.slice(0,10):'';}
export function endOfDay(value:string){return value?`${value}T23:59:59Z`:null;}
export function money(amount:number,currency:string){return new Intl.NumberFormat('ru-RU',{style:'currency',currency}).format(amount/100);}
