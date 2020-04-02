import { HttpErrors } from '@loopback/rest';
import { Credentials, UserRepository } from '../repositories/user.repository';
import { User } from '../models/user.model';
import { UserService } from '@loopback/authentication';
import { UserProfile, securityId } from '@loopback/security';
import { repository } from '@loopback/repository';
import { BcryptHasher } from './hash.password';
import { PasswordHasherBindings } from './key';
import { inject } from '@loopback/context';
import { AppResponse } from './appresponse';

export class MyUserService implements UserService<User, Credentials> {
  constructor(
    @repository(UserRepository) public userRepository: UserRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: BcryptHasher,
  ) { }

  async verifyCredentials(credentials: Credentials): Promise<User> {
    const invalidCredentialsError = 'Invalid email or password.';

    const foundUser = await this.userRepository.findOne({
      where: { email: credentials.email },
    });
    if (!foundUser) {
      throw new AppResponse(400, invalidCredentialsError);
    }

    const passwordMatched = await this.passwordHasher.comparePassword(
      credentials.password,
      foundUser.password,
    );

    if (!passwordMatched) {
      throw new AppResponse(400, invalidCredentialsError);
    }

    return foundUser;
  }

  convertToUserProfile(user: User): UserProfile {
    const userProfile = {
      [securityId]: user.id,
      id: user.id,
      email: user.email,
      typeUser: user.typeUser,
    };
    return userProfile;
  }
}
