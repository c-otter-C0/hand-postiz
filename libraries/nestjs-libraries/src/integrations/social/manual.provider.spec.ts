import {
  ManualProvider,
  decodeManualToken,
  encodeManualToken,
  manualPicture,
  parseManualFields,
} from '@gitroom/nestjs-libraries/integrations/social/manual.provider';

const provider = new ManualProvider();

const toRegex = (validation: string) => {
  const parts = validation.split('/');
  return new RegExp(parts.slice(1, -1).join('/'), parts.pop());
};

const code = (body: object) =>
  Buffer.from(JSON.stringify(body)).toString('base64');

const valid = {
  platform: 'instagram',
  handle: 'getkarot',
  profile_url: 'https://instagram.com/getkarot',
  login_email: '-',
  notes: 'posted from phone',
};

describe('ManualProvider', () => {
  it('identifies as manual / By hand', () => {
    expect(provider.identifier).toBe('manual');
    expect(provider.name).toBe('By hand');
    expect(provider.editor).toBe('normal');
    expect(provider.maxLength()).toBe(5000);
    expect(provider.isBetweenSteps).toBe(false);
    expect(provider.scopes).toEqual([]);
  });

  describe('customFields', () => {
    const field = async (key: string) =>
      toRegex(
        (await provider.customFields()).find((f) => f.key === key)!.validation
      );

    it('has the five text fields and no password field', async () => {
      const fields = await provider.customFields();
      expect(fields.map((f) => f.key)).toEqual([
        'platform',
        'handle',
        'profile_url',
        'login_email',
        'notes',
      ]);
      expect(fields.every((f) => f.type === 'text')).toBe(true);
    });

    it('limits platform to the allowed list', async () => {
      const re = await field('platform');
      for (const p of [
        'instagram',
        'tiktok',
        'reddit',
        'x',
        'threads',
        'linkedin',
        'youtube',
        'pinterest',
        'facebook',
        'other',
      ]) {
        expect(re.test(p)).toBe(true);
      }
      for (const p of ['', 'myspace', 'xx', 'instagram2', 'Instagram']) {
        expect(re.test(p)).toBe(false);
      }
    });

    it('requires a handle and an https profile url', async () => {
      const handle = await field('handle');
      expect(handle.test('getkarot')).toBe(true);
      expect(handle.test('')).toBe(false);
      expect(handle.test('two words')).toBe(false);
      const url = await field('profile_url');
      expect(url.test('https://instagram.com/getkarot')).toBe(true);
      expect(url.test('http://instagram.com/getkarot')).toBe(false);
      expect(url.test('instagram.com')).toBe(false);
    });

    it('accepts an email or the blank marker for login_email', async () => {
      const re = await field('login_email');
      expect(re.test('a@b.co')).toBe(true);
      expect(re.test('-')).toBe(true);
      expect(re.test('not an email')).toBe(false);
    });
  });

  describe('authenticate', () => {
    const auth = (body: object) =>
      provider.authenticate({ code: code(body), codeVerifier: '' });

    it('builds id, name, username and a platform icon', async () => {
      const r: any = await auth(valid);
      expect(r.id).toBe('manual:instagram:getkarot');
      expect(r.name).toBe('getkarot (instagram)');
      expect(r.username).toBe('getkarot');
      expect(r.picture).toBe('/icons/platforms/instagram.png');
      expect(r.accessToken).toMatch(/^by-hand:/);
      expect(r.expiresIn).toBeGreaterThan(60 * 60 * 24 * 365 * 100);
    });

    it('falls back to by-hand.png for other', async () => {
      const r: any = await auth({ ...valid, platform: 'other' });
      expect(r.picture).toBe('/icons/platforms/by-hand.png');
    });

    it('rejects bad input', async () => {
      expect(await auth({ ...valid, platform: 'myspace' })).toBe(
        'Invalid credentials'
      );
      expect(await auth({ ...valid, profile_url: 'http://x.com/a' })).toBe(
        'Invalid credentials'
      );
      expect(await auth({ ...valid, login_email: 'nope' })).toBe(
        'Invalid credentials'
      );
      expect(
        await provider.authenticate({ code: 'zzz', codeVerifier: '' })
      ).toBe('Invalid credentials');
    });

    it('refreshToken returns the token unchanged', async () => {
      const r: any = await auth(valid);
      expect((await provider.refreshToken(r.refreshToken)).accessToken).toBe(
        r.accessToken
      );
    });
  });

  describe('post', () => {
    it('completes with no network call, preferring liveUrl over profile_url', async () => {
      const fetchSpy = jest
        .spyOn(global, 'fetch' as any)
        .mockImplementation(() => {
          throw new Error('network call');
        });
      const r: any = await provider.authenticate({
        code: code(valid),
        codeVerifier: '',
      });

      const withLive = await provider.post('id', r.accessToken, [
        {
          id: 'p1',
          message: 'hi',
          settings: { liveUrl: 'https://instagram.com/p/abc' },
        },
      ]);
      expect(withLive).toEqual([
        {
          id: 'p1',
          postId: expect.any(String),
          releaseURL: 'https://instagram.com/p/abc',
          status: 'completed',
        },
      ]);

      const noLive = await provider.post('id', r.accessToken, [
        { id: 'p2', message: 'hi', settings: {} },
      ]);
      expect(noLive[0].releaseURL).toBe('https://instagram.com/getkarot');
      expect(noLive[0].status).toBe('completed');
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });

  describe('channel card helpers', () => {
    it('round-trips fields through the token, notes keep newlines', () => {
      const fields = parseManualFields({ ...valid, notes: 'line1\nline2' })!;
      expect(fields.notes).toBe('line1\nline2');
      const token = encodeManualToken(fields);
      expect(token).toMatch(/^by-hand:/);
      expect(decodeManualToken(token)).toEqual(fields);
    });

    it('treats "-" as blank and rejects bad input', () => {
      expect(
        parseManualFields({ ...valid, notes: '-', login_email: '-' })
      ).toMatchObject({ notes: '', login_email: '' });
      expect(parseManualFields({ ...valid, platform: 'myspace' })).toBeNull();
      expect(parseManualFields({ ...valid, handle: 'a b' })).toBeNull();
      expect(
        parseManualFields({ ...valid, profile_url: 'http://x.com' })
      ).toBeNull();
      expect(parseManualFields({ ...valid, login_email: 'nope' })).toBeNull();
      expect(
        parseManualFields({ ...valid, notes: 'x'.repeat(5000) })
      ).not.toBeNull();
      expect(
        parseManualFields({ ...valid, notes: 'x'.repeat(5001) })
      ).toBeNull();
      expect(parseManualFields(undefined)).toBeNull();
    });

    it('decodes garbage to an empty object and picks a platform icon', () => {
      expect(decodeManualToken('by-hand:!!!')).toEqual({});
      expect(manualPicture('x')).toBe('/icons/platforms/x.png');
      expect(manualPicture('other')).toBe('/icons/platforms/by-hand.png');
    });
  });
});
