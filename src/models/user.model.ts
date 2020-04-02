import { Entity, model, property, hasMany } from '@loopback/repository';
import { Coworking } from './coworking.model';
import { Transaction } from './transaction.model'
import { Client } from './client.model'

@model({
  settings: {
    hiddenProperties: ['password', 'token', 'firebase_token']
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

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;
