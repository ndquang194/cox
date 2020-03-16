import { Entity, model, property, hasMany } from '@loopback/repository';
import { Booking } from './booking.model';

@model({ settings: { strict: false } })
export class Transaction extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'number',
    required: true,
    default: 0,
  })
  price: number;

  @property({
    type: 'string',
    required: true,
    default: 'pending',
  })
  status: string;

  @property({
    type: 'date',
    required: true,
  })
  create_at: Date;

  @property({
    type: 'date',
    required: true,
  })
  update_at: Date;

  @property({
    type: 'array',
    itemType: 'string',
    default: []
  })
  bookingIDs: string[];

  @hasMany(() => Booking)
  bookings: Booking[];

  @property({
    type: 'string',
  })
  userId?: string;
  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Transaction>) {
    super(data);
  }
}

export interface TransactionRelations {
  // describe navigational properties here
}

export type TransactionWithRelations = Transaction & TransactionRelations;
