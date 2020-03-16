import {DefaultCrudRepository} from '@loopback/repository';
import {Booking, BookingRelations} from '../models';
import {CoexdbDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class BookingRepository extends DefaultCrudRepository<
  Booking,
  typeof Booking.prototype.id,
  BookingRelations
> {
  constructor(
    @inject('datasources.coexdb') dataSource: CoexdbDataSource,
  ) {
    super(Booking, dataSource);
  }
}
