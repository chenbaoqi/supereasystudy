// 解压云存储上的 pronunciations.zip → 批量上传 mp3 到 pronunciations/ 目录
// 调用: { zipFileID: 'cloud://cloud1-d8g6b7jctd1a3be1c.636c-cloud1-d8g6b7jctd1a3be1c-1455637430/pronunciations.zip' }
const cloud = require('wx-server-sdk');
const AdmZip = require('adm-zip');

cloud.init({ env: 'cloud1-d8g6b7jctd1a3be1c' });

const BATCH_SIZE = 10;
const TARGET_DIR = 'pronunciations/';

// context 由微信云函数调用框架传入，本函数用不到（下划线前缀 = 刻意保留的形参）
exports.main = async (event, _context) => {
  // 云控制台测试参数可能在 event 顶层，也可能在 event.data 内，或作为事件字符串
  console.log('raw event:', JSON.stringify(event));
  let zipFileID = event?.zipFileID || event?.data?.zipFileID;
  // 有时测试面板直接传值为字符串（非 JSON），回退尝试
  if (!zipFileID && typeof event === 'string') {
    // 解析失败说明既不是 JSON 也不是预期结构，交给下面的「缺少 zipFileID」分支兜底
    try { const p = JSON.parse(event); zipFileID = p.zipFileID || p; } catch { /* noop */ }
  }
  if (!zipFileID) {
    return { ok: false, error: '缺少 zipFileID 参数', hint: '请将整个 JSON 填入测试参数框，确保覆盖默认模板', receivedEvent: event };
  }

  console.log(`下载 ${zipFileID} ...`);
  const res = await cloud.downloadFile({ fileID: zipFileID });
  const buffer = res.fileContent;

  const zip = new AdmZip(buffer);
  const entries = zip.getEntries().filter(
    (e) => !e.isDirectory && e.entryName.endsWith('.mp3'),
  );
  console.log(`ZIP 内含 ${entries.length} 个 mp3，开始上传...`);

  let uploaded = 0;
  let errors = 0;

  const uploadOne = async (entry) => {
    try {
      await cloud.uploadFile({
        cloudPath: TARGET_DIR + entry.entryName,
        fileContent: entry.getData(),
      });
      uploaded++;
    } catch (e) {
      errors++;
      console.error(`失败: ${entry.entryName}`, e.message);
    }
  };

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE).map(uploadOne);
    await Promise.all(batch);
    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= entries.length) {
      console.log(`进度: ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length}`);
    }
  }

  return { ok: true, uploaded, errors, total: entries.length };
};
