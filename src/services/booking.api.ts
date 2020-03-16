import {
  Entity, model, property, Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from "@loopback/repository";
import { Booking, StyleRoom, Transaction } from '../models';
import { BookingRepository, StyleRoomRepository } from '../repositories';
@model()
export class CreateBooking extends Entity {
  @property({
    type: 'number',
    require: true,
  })
  numberPerson: number;
  @property({
    type: 'string',
    require: true,
  })
  style_room_id: string;

  @property({
    require: true,
    type: 'number'
  })
  startTime: number;

  @property({
    require: true,
    type: 'number'
  })
  duration: number;

  @property({
    type: 'array',
    require: true,
    itemType: 'string'
  })
  listDate: string[];

  @property({
    type: 'number',
    require: true,
  })
  price: number;
}



