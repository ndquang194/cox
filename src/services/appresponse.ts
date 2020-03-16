export class AppResponse {
  code?: number;
  message?: string;
  data?: any;
  constructor(code: number, message: string, data: any) {
    this.code = code;
    this.message = message;
    this.data = data;
  }
  // getResponse() {
  //   return {
  //     status: this.code,
  //     message: this.message,
  //     content: {
  //       'application/json': this.data
  //     }
  //   }
  // }
}
