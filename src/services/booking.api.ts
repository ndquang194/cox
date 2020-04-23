import {
  Entity, model, property, Model, repository,
} from "@loopback/repository";
import { BookingRepository, RoomRepository } from "../repositories";
import { AppResponse } from "./appresponse";
import { Booking } from "../models";
import { MyDefault } from "./mydefault";

@model()
class mDate extends Model {
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
    require: true,
    type: 'string'
  })
  date: string;
}

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
  room_id: string;

  @property({
    type: 'array',
    require: true,
    itemType: mDate
  })
  listDate: mDate[];
}


export class ValidateBooking {
  constructor(
    public bookingRepository: BookingRepository,
    public roomrepository: RoomRepository, ) {
  }

  async   checkCondition(createBooking: CreateBooking, transactionId: string) {
    let result = {
      status: false,
      message: '',
      data: []
    };
    if (createBooking.numberPerson <= 0 || !createBooking.listDate || createBooking.listDate.length == 0 ||
      !createBooking.room_id) {
      throw new AppResponse(400, 'missing field');
    }
    let room = await this.roomrepository.findById(createBooking.room_id);
    let bookings: any = [];

    for (var i = 0; i < createBooking.listDate.length; i++) {
      let day = createBooking.listDate[i].date;
      let startTime = createBooking.listDate[i].startTime;
      let endTime = startTime + createBooking.listDate[i].duration;
      let date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setFullYear(parseInt(day.substring(6, 10)), parseInt(day.substring(3, 5)) - 1, parseInt(day.substring(0, 2)));
      if (startTime < 0 || endTime <= startTime || endTime > 24 || !day || date.getTime() <= 0) {
        throw new AppResponse(400, 'missing field');
      }
      const where = {
        where: {
          date_time: date,
          status: { inq: [MyDefault.TRANSACTION_STATUS.PENDING, MyDefault.TRANSACTION_STATUS.ON_GOING] },
          transactionId: { neq: transactionId }
        },
        include: [{ relation: 'transaction' }]
      };
      let aBookings = await this.bookingRepository.find(where);
      var person: number[] = [];
      for (var t = 0; t < 24; t++)
        person.push(0);
      if (!aBookings != undefined) {
        for (var j = 0; j < aBookings.length; j++) {
          if (aBookings[j].transaction?.roomId != room.id) continue;
          for (var t = aBookings[j].start_time; t < aBookings[j].end_time; t++)
            person[t] += aBookings[j].numPerson;
        }
        var MaxPerson = person[startTime];
        for (var t = startTime; t < endTime; t++)
          if (MaxPerson < person[t]) MaxPerson = person[t];
        if (createBooking.numberPerson > room.maxPerson - MaxPerson) {
          throw new AppResponse(400, 'not enough person');
        }
      }
      let booking = new Booking();
      booking.numPerson = createBooking.numberPerson;
      booking.start_time = startTime;
      booking.end_time = endTime;
      booking.date_time = date;
      booking.status = MyDefault.BOOKING_STATUS.PENDING;
      bookings.push(booking);
    }
    result.status = true;
    result.message = 'success';
    result.data = bookings;
    return result;
  }
}

export async function getPrice(roomrepository: RoomRepository, createBooking: CreateBooking) {
  let room = await roomrepository.findById(createBooking.room_id);
  let price: number = 0;
  for (var i = 0; i < createBooking.listDate.length; i++) {
    price += createBooking.numberPerson * room.price * createBooking.listDate[i].duration;
  }
  return price;
}
