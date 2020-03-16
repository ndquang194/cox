import { Request, Response } from '@loopback/rest';
import multer = require('multer');

export async function parseRequest(request: Request, response: Response) {
  const storage = multer.memoryStorage();
  const upload = multer({ storage });
  let requestBody = await new Promise<object>((resolve, reject) => {
    upload.any()(request, response, err => {
      if (err) reject(err);
      else {
        resolve({
          fields: request.body,
          files: request.files,
        });
      }
    });
  });
  return requestBody;
}
