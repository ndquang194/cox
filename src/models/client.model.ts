import { Model, model, property, Entity } from '@loopback/repository';

@model({
  settings: {
    hiddenProperties: ['coin', 'point', 'listCard']
  }
})
export class Client extends Model {
  @property({
    type: 'string',
    required: true,
  })
  name?: string;

  @property({
    type: 'string',
    required: true,
  })
  phone?: string;

  constructor(data?: Partial<Client>) {
    super(data);
  }
}

export interface ClientRelations {
  // describe navigational properties here
}

export type ClientWithRelations = Client & ClientRelations;
