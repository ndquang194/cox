var fs = require('fs');
const uuidv4 = require('uuid/v4')
const path = require('path');
import { Path } from '../services/key';

export async function saveFile(files: Array<any>, folder: string) {
  let filesName: string[] = [];
  files.forEach(async (item) => {
    const fileExt = path.extname(item.originalname);
    const filename = `${path.join(folder, uuidv4() + fileExt)}`;
    await fs.writeFileSync(`${path.join(Path.root, filename)}`, item.buffer);
    filesName.push(filename);
  });
  return filesName;
}
