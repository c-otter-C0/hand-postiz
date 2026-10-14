import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { makeSecureId } from '@gitroom/nestjs-libraries/services/make.secure.id';
import dayjs from 'dayjs';
import { randomUUID } from 'crypto';

// Platforms with an icon in apps/frontend/public/icons/platforms/<name>.png
const iconPlatforms = [
  'instagram',
  'tiktok',
  'reddit',
  'x',
  'threads',
  'linkedin',
  'youtube',
  'pinterest',
  'facebook',
];
const platforms = [...iconPlatforms, 'other'];

const platformRegex = new RegExp(`^(${platforms.join('|')})$`);
const handleRegex = /^\S{1,100}$/;
const httpsUrlRegex = /^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The connect form (add.provider.component.tsx) marks every field .required(),
// so optional fields ship a "-" default that means "left blank".
const blank = (value?: string) =>
  !value || value.trim() === '-' ? '' : value.trim();

// The token holds the channel details (no secrets) so post() can fall back to the profile URL.
export const manualPicture = (platform: string) =>
  iconPlatforms.includes(platform)
    ? `/icons/platforms/${platform}.png`
    : '/icons/platforms/by-hand.png';

export type ManualFields = {
  platform: string;
  handle: string;
  profile_url: string;
  login_email: string;
  notes: string;
};

export const decodeManualToken = (token: string): Partial<ManualFields> => {
  try {
    return JSON.parse(
      Buffer.from(token.replace(/^by-hand:/, ''), 'base64').toString()
    );
  } catch {
    return {};
  }
};

export const encodeManualToken = (fields: ManualFields) =>
  `by-hand:${Buffer.from(JSON.stringify(fields)).toString('base64')}`;

// Shared by connect (authenticate) and the channel card; notes may be multi-line.
export const parseManualFields = (body: any): ManualFields | null => {
  const { platform, handle, profile_url } = body || {};
  const login_email = blank(body?.login_email);
  const notes = blank(body?.notes);
  if (
    !platformRegex.test(platform) ||
    !handleRegex.test(handle) ||
    !httpsUrlRegex.test(profile_url) ||
    (login_email && !emailRegex.test(login_email)) ||
    notes.length > 5000
  ) {
    return null;
  }
  return { platform, handle, profile_url, login_email, notes };
};

const farFuture = () => dayjs().add(200, 'year').unix() - dayjs().unix();

export class ManualProvider extends SocialAbstract implements SocialProvider {
  identifier = 'manual';
  name = 'By hand';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'normal' as const;
  toolTip =
    'A channel you post to yourself. Postiz keeps the calendar; nothing is sent to the platform.';

  maxLength() {
    return 5000;
  }

  async customFields() {
    return [
      {
        key: 'platform',
        label: 'Platform',
        defaultValue: 'other',
        validation: `/${platformRegex.source}/`,
        type: 'text' as const,
        hint: `One of: ${platforms.join(', ')}`,
      },
      {
        key: 'handle',
        label: 'Handle',
        validation: `/${handleRegex.source}/`,
        type: 'text' as const,
      },
      {
        key: 'profile_url',
        label: 'Profile URL',
        validation: `/${httpsUrlRegex.source}/`,
        type: 'text' as const,
        hint: 'https://...',
      },
      {
        key: 'login_email',
        label: 'Login email (optional)',
        defaultValue: '-',
        validation: `/^(-|${emailRegex.source.slice(1, -1)})$/`,
        type: 'text' as const,
        hint: 'Which email the account uses. Never enter a password. "-" means none.',
      },
      {
        key: 'notes',
        label: 'Notes (optional)',
        defaultValue: '-',
        validation: `/^.{1,500}$/`,
        type: 'text' as const,
        hint: '"-" means none.',
      },
    ];
  }

  // Nothing expires, so refreshing hands back the stored token unchanged.
  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: refresh_token,
      accessToken: refresh_token,
      expiresIn: farFuture(),
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async generateAuthUrl() {
    const state = makeSecureId(17);
    return {
      url: state,
      codeVerifier: makeSecureId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    try {
      const body = JSON.parse(Buffer.from(params.code, 'base64').toString());
      const fields = parseManualFields(body);
      if (!fields) {
        return 'Invalid credentials';
      }
      const { platform, handle } = fields;
      const token = encodeManualToken(fields);

      return {
        id: `manual:${platform}:${handle}`,
        name: `${handle} (${platform})`,
        accessToken: token,
        // refresh() calls refreshToken(integration.refreshToken); keeping the token here lets it round-trip.
        refreshToken: token,
        expiresIn: farFuture(),
        picture: manualPicture(platform),
        username: handle,
      };
    } catch (e) {
      return 'Invalid credentials';
    }
  }

  // No network call: the human posts it, Postiz only keeps the record.
  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;
    return [
      {
        id: firstPost.id,
        postId: randomUUID(),
        releaseURL:
          firstPost.settings?.liveUrl || decodeManualToken(accessToken).profile_url || '',
        status: 'completed',
      },
    ];
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    return this.post(id, accessToken, postDetails);
  }

  override async checkPostStatus(accessToken: string, pendingData: any) {
    return { status: 'completed' as const, postId: '', releaseURL: '' };
  }

  override async finalizePost(accessToken: string, pendingData: any) {
    return { status: 'completed' as const, postId: '', releaseURL: '' };
  }
}
