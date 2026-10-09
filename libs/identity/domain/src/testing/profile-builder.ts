import { AvatarUrl, DisplayName, EmailAddress, OAuthProvider, ProviderSubject } from '../identity-fields';
import type { ProviderProfile } from '../provider-profile';

/**
 * Test builder for what a provider reports at sign-in.
 *
 * ```ts
 * const amiri = new ProfileBuilder().named('Amiri').withEmail('amiri@example.com').build();
 * ```
 */
export class ProfileBuilder {
  readonly #provider: OAuthProvider = OAuthProvider.GitHub;
  #subject: ProviderSubject = ProviderSubject.parse('1001');
  #displayName: DisplayName = DisplayName.parse('Amiri');
  #avatarUrl: AvatarUrl | undefined = undefined;
  #email: EmailAddress | undefined = undefined;
  #emailVerified = false;

  public withSubject(id: string): this {
    this.#subject = ProviderSubject.parse(id);
    return this;
  }

  public named(name: string): this {
    this.#displayName = DisplayName.parse(name);
    return this;
  }

  public withAvatar(url: string): this {
    this.#avatarUrl = AvatarUrl.parse(url);
    return this;
  }

  public withEmail(email: string, verified = true): this {
    this.#email = EmailAddress.parse(email);
    this.#emailVerified = verified;
    return this;
  }

  public build(): ProviderProfile {
    return {
      provider: this.#provider,
      subject: this.#subject,
      displayName: this.#displayName,
      avatarUrl: this.#avatarUrl,
      email: this.#email,
      emailVerified: this.#emailVerified,
    };
  }
}
