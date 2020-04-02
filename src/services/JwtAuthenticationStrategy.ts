import { inject } from '@loopback/context';
import { HttpErrors, Request } from '@loopback/rest';
import { AuthenticationStrategy, TokenService } from '@loopback/authentication';
import { UserProfile, securityId } from '@loopback/security';
import { TokenServiceBindings } from './key';
import { User } from '../models'
import { UserRepository } from '../repositories'
import { repository } from '@loopback/repository';
import { AppResponse } from './appresponse';

export class JWTAuthenticationStrategy implements AuthenticationStrategy {
  name: string = 'jwt';

  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public tokenService: TokenService,
    @repository(UserRepository)
    public userRepository: UserRepository,
  ) { }

  async authenticate(request: Request): Promise<UserProfile | undefined> {
    const token: string = this.extractCredentials(request);
    const userProfile = await this.tokenService.verifyToken(token);
    let user = await this.userRepository.findById(userProfile[securityId]);
    if (!user || !user.token.includes(token)) {
      throw new AppResponse(401, `Error verifying token : jwt expired`);
    }
    return userProfile;
  }

  extractCredentials(request: Request): string {
    if (!request.headers.authorization) {
      throw new AppResponse(401, `Authorization header not found.`);
    }

    // for example : Bearer xxx.yyy.zzz
    const authHeaderValue = request.headers.authorization;

    if (!authHeaderValue.startsWith('Bearer')) {
      throw new AppResponse(401, `Authorization header is not of type 'Bearer'.`);
    }

    //split the string into 2 parts : 'Bearer ' and the `xxx.yyy.zzz`
    const parts = authHeaderValue.split(' ');
    if (parts.length !== 2)
      throw new AppResponse(401, `Authorization header value has too many parts. It must follow the pattern: 'Bearer xx.yy.zz' where xx.yy.zz is a valid JWT token.`);
    const token = parts[1];

    return token;
  }
}
