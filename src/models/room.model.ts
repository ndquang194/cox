import { Entity, model, property, hasOne, hasMany, belongsTo } from '@loopback/repository';
import { Service } from './service.model';
import { StyleRoom, StyleRoomWithRelations } from './style-room.model';
import { User, UserWithRelations } from './user.model';

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
  })
  about?: string;

  @property({
    type: 'array',
    itemType: 'string',
  })
  photo?: string[];

  @property({
    type: Service,
  })
  service: Service;

  @belongsTo(() => User)
  userId: string;

  @hasMany(() => StyleRoom, { keyTo: 'roomId' })
  styleRooms?: StyleRoom[];

  constructor(data?: Partial<Room>) {
    super(data);
  }
}

export interface RoomRelations {
  user?: UserWithRelations;
}

export type RoomWithRelations = Room & RoomRelations;
