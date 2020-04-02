import { DefaultCrudRepository, BelongsToAccessor, repository, HasManyRepositoryFactory } from '@loopback/repository';
import { Room, RoomRelations, Coworking, Transaction } from '../models';
import { CoexdbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { CoworkingRepository } from './coworking.repository';
import { TransactionRepository } from './transaction.repository';

export class RoomRepository extends DefaultCrudRepository<
  Room,
  typeof Room.prototype.id,
  RoomRelations
  > {
  public readonly coworking: BelongsToAccessor<
    Coworking,
    typeof Room.prototype.id
  >;
  public readonly transactions: HasManyRepositoryFactory<
    Transaction,
    typeof Room.prototype.id
  >;
  constructor(
    @inject('datasources.coexdb') dataSource: CoexdbDataSource,
    @repository.getter('CoworkingRepository')
    coworkingRepositoryGetter: Getter<CoworkingRepository>,
    @repository.getter('TransactionRepository')
    protected transactionRepositoryGeter: Getter<TransactionRepository>,
  ) {
    super(Room, dataSource);
    this.coworking = this.createBelongsToAccessorFor(
      'coworking',
      coworkingRepositoryGetter,
    );
    this.registerInclusionResolver('coworking', this.coworking.inclusionResolver);
    this.transactions = this.createHasManyRepositoryFactoryFor(
      'transactions',
      transactionRepositoryGeter,
    );
    this.registerInclusionResolver('transactions', this.transactions.inclusionResolver);
  }
}
