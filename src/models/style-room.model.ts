import { Model, model, property, Entity, belongsTo, hasMany } from '@loopback/repository';
import { Room, RoomWithRelations } from './room.model';
import { Booking } from './booking.model';

@model({
  settings: {
    strictObjectIDCoercion: true,
  }
})
export class StyleRoom extends Entity {
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

  @property({
    type: 'array',
    itemType: 'string',
    default: []
  })
  bookingIDs: string[];

  @belongsTo(() => Room)
  roomId: string;

  @hasMany(() => Booking)
  bookings: Booking[];

  constructor(data?: Partial<StyleRoom>) {
    super(data);
  }
}

export interface StyleRoomRelations {
  room?: RoomWithRelations;
}

export type StyleRoomWithRelations = StyleRoom & StyleRoomRelations;
