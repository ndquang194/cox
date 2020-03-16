import { Entity, model, property } from '@loopback/repository';

@model({ settings: { strict: false } })
export class Booking extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
  })
  description?: string;

  @property({
    type: 'number',
    required: true,
  })
  start_time: number;

  @property({
    type: 'number',
    required: true,
  })
  end_time: number;

  @property({
    type: 'number',
    required: true,
  })
  numPerson: number;

  @property({
    type: 'date',
    required: true,
  })
  date_time: Date;

  @property({
    type: 'string',
    default: 'pending',
  })
  status?: string;

  @property({
    type: 'string',
  })
  userId?: string;

  @property({
    type: 'string',
  })
  styleRoomId?: string;

  @property({
    type: 'string',
  })
  transactionId?: string;
  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Booking>) {
    super(data);
  }
}

export interface BookingRelations {
  // describe navigational properties here
}

export type BookingWithRelations = Booking & BookingRelations;
