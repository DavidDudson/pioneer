import { InstantCodec } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { AvatarUrl, DisplayName, EmailAddress, UserId } from './identity-fields';
import type { ProviderProfile } from './provider-profile';

/** JSON shape of a user on the wire: the signed-in user's own account. */
export const UserWire = z.object({
  id: UserId,
  displayName: DisplayName,
  avatarUrl: AvatarUrl.optional(),
  email: EmailAddress.optional(),
  emailVerified: z.boolean(),
  createdAt: InstantCodec,
  updatedAt: InstantCodec,
});

interface UserProps {
  readonly id: UserId;
  readonly displayName: DisplayName;
  readonly avatarUrl: AvatarUrl | undefined;
  readonly email: EmailAddress | undefined;
  readonly emailVerified: boolean;
  readonly createdAt: Temporal.Instant;
  readonly updatedAt: Temporal.Instant;
}

/**
 * A Pioneer account. Created on first sign-in from the provider's profile; name, avatar and
 * email follow the provider on every later sign-in. Immutable like `Character`.
 */
export class User {
  public static readonly codec = z.codec(UserWire, z.instanceof(User), {
    decode: (wire) => new User({ ...wire, avatarUrl: wire.avatarUrl, email: wire.email }),
    encode: (user) => user.toProps(),
  });

  public readonly id: UserId;
  public readonly displayName: DisplayName;
  public readonly avatarUrl: AvatarUrl | undefined;
  public readonly email: EmailAddress | undefined;
  public readonly emailVerified: boolean;
  public readonly createdAt: Temporal.Instant;
  public readonly updatedAt: Temporal.Instant;

  public constructor(props: UserProps) {
    this.id = props.id;
    this.displayName = props.displayName;
    this.avatarUrl = props.avatarUrl;
    this.email = props.email;
    this.emailVerified = props.emailVerified;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static fromProfile(id: UserId, profile: ProviderProfile, now: Temporal.Instant): User {
    return new User({ id, ...User.#profileFields(profile), createdAt: now, updatedAt: now });
  }

  /** The provider's current name, avatar and email. */
  public withProfile(profile: ProviderProfile, now: Temporal.Instant): User {
    return new User({ ...this.toProps(), ...User.#profileFields(profile), updatedAt: now });
  }

  static #profileFields(
    profile: ProviderProfile,
  ): Pick<UserProps, 'avatarUrl' | 'displayName' | 'email' | 'emailVerified'> {
    return {
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      email: profile.email,
      emailVerified: profile.email !== undefined && profile.emailVerified,
    };
  }

  private toProps(): UserProps {
    return {
      id: this.id,
      displayName: this.displayName,
      avatarUrl: this.avatarUrl,
      email: this.email,
      emailVerified: this.emailVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
