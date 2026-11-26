import type { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

const sendMock = jest.fn();
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: sendMock } })) }));

const config = {
  getOrThrow: () => 're_test',
  get: (key: string) => ({ EMAIL_FROM: 'hello@example.com', WEB_URL: 'https://app.test', LANDING_URL: 'https://landing.test' })[key],
} as unknown as ConfigService;

const invite = {
  to: 'm@x.com',
  fullName: 'Ana',
  gymName: "Gold's Gym, Makati",
  gymCode: 'GOLD',
  token: 'tok',
};

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({ data: { id: '1' }, error: null });
    service = new EmailService(config);
  });

  it('quotes the sender display name', async () => {
    await service.sendMemberInvite(invite);
    expect(sendMock.mock.calls[0][0].from).toBe(`"Gold's Gym, Makati via FitOps" <hello@example.com>`);
  });

  it('returns false when Resend reports an error', async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'bad from' } });
    await expect(service.sendMemberInvite(invite)).resolves.toBe(false);
  });

  it('returns true when the email is accepted', async () => {
    await expect(service.sendMemberInvite(invite)).resolves.toBe(true);
  });

  it('escapes gym and member names in the HTML', async () => {
    await service.sendMemberInvite({ ...invite, gymName: '<a href="x">Hi</a>', fullName: '<b>Ana</b>' });
    const html: string = sendMock.mock.calls[0][0].html;
    expect(html).not.toContain('<a href="x">');
    expect(html).not.toContain('<b>Ana</b>');
    expect(html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
  });

  it('adds the missing # to a gym accent', async () => {
    await service.sendMemberInvite({ ...invite, gymAccent: 'ff5500' });
    expect(sendMock.mock.calls[0][0].html).toContain('background-color:#FF5500');
  });

  it('links the welcome email to the landing site', async () => {
    await service.sendMemberWelcome({ to: 'm@x.com', fullName: 'Ana', gymName: 'Iron', gymCode: 'IRON' });
    expect(sendMock.mock.calls[0][0].html).toContain('href="https://landing.test"');
  });
});
