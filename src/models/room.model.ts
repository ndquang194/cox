import { Model, model, property, Entity, belongsTo, hasMany } from '@loopback/repository';
import { Coworking, CoworkingWithRelations } from './coworking.model';
import { Transaction } from './transaction.model';

@model({
  settings: {
    strictObjectIDCoercion: true,
  }
})
export class Room extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    required: true,
  })
  about: string;

  @property({
    type: 'number',
    required: true,
  })
  price: number;

  @property({
    type: 'number',
    required: true,
  })
  maxPerson: number;

  @belongsTo(() => Coworking)
  coworkingId: string;

  @hasMany(() => Transaction, { keyTo: 'roomId' })
  transactions: Transaction[];

  constructor(data?: Partial<Room>) {
    super(data);
  }
}

export interface RoomRelations {
  coworking?: CoworkingWithRelations;
}

export type RoomWithRelations = Room & RoomRelations;
