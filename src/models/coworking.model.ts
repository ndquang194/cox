import { Entity, model, property, hasOne, hasMany, belongsTo } from '@loopback/repository';
import { Service } from './service.model';
import { Room, RoomWithRelations } from './room.model';
import { User, UserWithRelations } from './user.model';
import { Client } from './client.model'

@model({
  settings: {
    strictObjectIDCoercion: true,
  }
})
export class Coworking extends Entity {
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
    type: 'string',
  })
  phone?: string;

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

  @property({
    type: 'string',
  })
  address: string;

  @property({
    type: 'array',
    itemType: 'number',
  })
  location?: number[];

  @hasMany(() => Room, { keyTo: 'coworkingId' })
  rooms?: Room[];

  constructor(data?: Partial<Room>) {
    super(data);
  }
}

export interface CoworkingRelations {
  user?: UserWithRelations;
}

export type CoworkingWithRelations = Coworking & CoworkingRelations;
