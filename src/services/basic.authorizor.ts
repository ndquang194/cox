import {
  AuthorizationContext,
  AuthorizationMetadata,
  AuthorizationDecision,
} from '@loopback/authorization';
import _ from 'lodash';
import { UserProfile, securityId } from '@loopback/security';
import { AppResponse } from './appresponse';

// Instance level authorizer
// Can be also registered as an authorizer, depends on users' need.
export async function basicAuthorization(
  authorizationCtx: AuthorizationContext,
  metadata: AuthorizationMetadata,
): Promise<AuthorizationDecision> {
  // No access if authorization details are missing
  let currentUser: UserProfile;
  if (authorizationCtx.principals.length > 0) {
    const user = _.pick(authorizationCtx.principals[0], [
      'id',
      'email',
      'typeUser',
    ]);
    currentUser = { [securityId]: user.id, email: user.email, typeUser: user.typeUser ? "Admin" : "Customer" };
  } else {
    throw new AppResponse(401, 'Access denied');
  }

  // No require Role
  if (!metadata.allowedRoles) {
    return AuthorizationDecision.ALLOW;
  }

  //Check roles
  let roleIsAllowed = false;
  if (metadata.allowedRoles.includes(currentUser.typeUser)) {
    roleIsAllowed = true;
  }

  if (!roleIsAllowed)
    throw new AppResponse(401, 'Access denied');
  return AuthorizationDecision.ALLOW;
}
