import { Model, model, property } from '@loopback/repository';

@model()
export class AppResponse extends Model {
  @property({
    type: 'number',
  })
  code: number;

  @property({
    type: 'string',
  })
  message: string;

  @property()
  data?: any;

  constructor(code: number, message: string, data?: any) {
    super();
    this.code = code;
    this.message = message;
    // this.key = key;
    this.data = data;
  }
}
