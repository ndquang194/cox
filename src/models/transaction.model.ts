import { Entity, model, property, hasMany, belongsTo } from '@loopback/repository';
import { Booking } from './booking.model';
import { User, UserWithRelations } from '.';
import { Room, RoomWithRelations } from './room.model';

@model({
  settings: {
    strictObjectIDCoercion: true,
  }
})
export class Transaction extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id: string;

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
    type: 'boolean',
    required: true,
    default: false
  })
  check_in: boolean;

  @property({
    type: 'boolean',
    required: true,
    default: false
  })
  check_out: boolean;

  @property({
    type: 'string',
    required: true,
  })
  booking_reference: string;

  @hasMany(() => Booking)
  bookings: Booking[];

  @belongsTo(() => User)
  userId: string;

  @belongsTo(() => Room)
  roomId: string;


  constructor(data?: Partial<Transaction>) {
    super(data);
  }
}

export interface TransactionRelations {
  user?: UserWithRelations;
  room?: RoomWithRelations;
}

export type TransactionWithRelations = Transaction & TransactionRelations;
