import { Entity, model, property, hasMany, Model } from '@loopback/repository';
import { Coworking } from './coworking.model';
import { Transaction } from './transaction.model'
import { Client } from './client.model'

@model()
export class Card extends Model {
  @property({
    type: 'string',
    required: true,
  })
  name?: string;
  @property({
    type: 'string',
    required: true,
  })
  address?: string;
}


@model({
  settings: {
    hiddenProperties: ['password', 'token', 'firebase_token', 'point', 'coin', 'listCard', 'list_exchange_coin', 'list_exchange_point']
  }
})
export class User extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id: string;

  @property({
    type: 'string',
    required: true,
    index: {
      unique: true,
    },
  })
  email: string;

  @property({
    type: 'string',
    required: true,
  })
  password: string;

  @property({
    type: 'boolean',
    required: true,
  })
  typeUser: boolean;

  @property({
    type: Client,
  })
  client: Client;

  @hasMany(() => Coworking, { keyTo: 'userId' })
  coworkings: Coworking[];

  @hasMany(() => Transaction, { keyTo: 'userId' })
  transactions: Transaction[];


  @property({
    type: 'array',
    itemType: 'string',
    default: []
  })
  token: string[];

  @property({
    type: 'array',
    itemType: 'string',
    default: []
  })
  firebase_token: string[];

  @property({
    type: 'number',
    default: 0,
  })
  point?: number;

  @property({
    type: 'number',
    default: 0,
  })
  coin?: number;

  @property({
    type: 'array',
    itemType: Card,
    default: []
  })
  listCard: Card[];

  @property({
    type: 'array',
    itemType: 'object',
    default: []
  })
  list_exchange_coin?: object[];

  @property({
    type: 'array',
    itemType: 'object',
    default: []
  })
  list_exchange_point?: object[];

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;
