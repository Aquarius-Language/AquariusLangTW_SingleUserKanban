// 共用文字事件橋接：組字預覽與提交分開，避免遺漏或重複中文。
export function 安裝文字輸入(主機, 排隊) {
  const 欄位 = 主機.textarea, signal = 主機.abort.signal;
  let 上次組字提交 = null;
  const 提交 = (文字, 時間) => {
    if (!文字) return;
    排隊('textInput', {inputText:文字, inputTimestamp:時間 / 1000});
    for (const 字 of 文字) 排隊('keyTyped', {key:字});
  };
  欄位.addEventListener('input', 事件 => {
    if (事件.isComposing || 主機.composing) return;
    const 文字 = 事件.data ?? 欄位.value;
    // 有些瀏覽器在 compositionend 後補送一次 input；欄位已清空。
    const 重複 = 上次組字提交 === 文字 &&
      (欄位.value === '' || 事件.inputType?.includes('Composition'));
    上次組字提交 = null;
    if (!重複 && 事件.inputType !== 'insertLineBreak') 提交(文字, 事件.timeStamp);
    欄位.value = '';
  }, {signal});
  for (const [類型, 名稱] of [
    ['compositionstart', 'compositionStarted'],
    ['compositionupdate', 'compositionUpdated'],
    ['compositionend', 'compositionEnded'],
  ]) 欄位.addEventListener(類型, 事件 => {
    主機.composing = 類型 !== 'compositionend';
    const 文字 = 事件.data ?? '';
    排隊(名稱, {compositionText:主機.composing ? 文字 : '',
      compositionCursor:主機.composing ? 文字.length : 0, isComposing:主機.composing});
    if (主機.composing) 上次組字提交 = null;
    else {
      提交(文字, 事件.timeStamp);
      上次組字提交 = 文字;
      欄位.value = '';
    }
  }, {signal});
}
