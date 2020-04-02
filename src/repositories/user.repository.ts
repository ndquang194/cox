import { DefaultCrudRepository, HasManyRepositoryFactory, repository } from '@loopback/repository';
import { User, UserRelations, Coworking, Transaction } from '../models';
import { CoexdbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { CoworkingRepository } from './coworking.repository';
import { TransactionRepository } from './transaction.repository';

export type Credentials = {
  email: string;
  password: string;
  firebase_token: string;
};

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id,
  UserRelations
  > {
  public readonly coworkings: HasManyRepositoryFactory<
    Coworking,
    typeof User.prototype.id
  >;
  public readonly transactions: HasManyRepositoryFactory<
    Transaction,
    typeof User.prototype.id
  >;
  constructor(
    @inject('datasources.coexdb') dataSource: CoexdbDataSource,
    @repository.getter('CoworkingRepository')
    getCoworkingRepository: Getter<CoworkingRepository>,
    @repository.getter('TransactionRepository')
    protected transactionRepositoryGeter: Getter<TransactionRepository>,
  ) {
    super(User, dataSource);
    this.coworkings = this.createHasManyRepositoryFactoryFor(
      'coworkings',
      getCoworkingRepository,
    );
    this.registerInclusionResolver('rooms', this.coworkings.inclusionResolver);
    this.transactions = this.createHasManyRepositoryFactoryFor(
      'transactions',
      transactionRepositoryGeter,
    );
    this.registerInclusionResolver('transactions', this.transactions.inclusionResolver);
  }
}
