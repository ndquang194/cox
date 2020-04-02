import { Entity, model, property, belongsTo } from '@loopback/repository';
import { Transaction, TransactionWithRelations } from './transaction.model';

@model({
  settings: {
    strictObjectIDCoercion: true,
  }
})
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

  @belongsTo(() => Transaction)
  transactionId: string;

  constructor(data?: Partial<Booking>) {
    super(data);
  }
}

export interface BookingRelations {
  transaction?: TransactionWithRelations;
}

export type BookingWithRelations = Booking & BookingRelations;
