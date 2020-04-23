var fs = require('fs');
const uuidv4 = require('uuid/v4')
const path = require('path');
import { Path } from '../services/key';

export async function saveFile(files: Array<any>, folder: string) {
  let filesName: string[] = [];
  files.forEach(async (item) => {
    const fileExt = path.extname(item.originalname);
    const filename = `${uuidv4() + fileExt}`;
    const filePath = `${path.join(folder, filename)}`;
    await fs.writeFileSync(`${path.join(Path.root, filePath)}`, item.buffer);
    filesName.push(filename);
  });
  return filesName;
}

export async function deleteFile(files: Array<any>, folder: string) {
  files.forEach(async (item) => {
    const filePath = `${path.join(folder, item)}`;
    const file = `${path.join(Path.root, filePath)}`;
    if (await fs.existsSync(file)) {
      await fs.unlinkSync(file);
    }
  });
}
