import bcrypt from 'bcrypt';
import { MoreThan } from 'typeorm';
import type { AuthResult, LoginInput, MeResult, RegisterInput, ResetPasswordInput } from '@matjari/shared';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';
import { Store } from '../entities/Store';
import { User } from '../entities/User';
import { toStoreDto, toUserDto } from '../utils/dto';
import { HttpError } from '../utils/http-error';
import { passwordResetEmail, sendMail } from '../utils/mailer';
import { randomToken, sha256, signAccessToken, signRefreshToken } from '../utils/tokens';
import { getStoreAccess } from './platform.service';

const BCRYPT_COST = 12;
const RESET_TTL_MS = 60 * 60 * 1000;
// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash('not-a-real-password', BCRYPT_COST));

const users = () => AppDataSource.getRepository(User);

export interface IssuedTokens extends AuthResult {
  refreshToken: string;
}

function issue(user: User): IssuedTokens {
  return {
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
    user: toUserDto(user),
  };
}

export async function register(input: RegisterInput): Promise<IssuedTokens> {
  const exists = await users().exists({ where: { email: input.email } });
  if (exists) throw HttpError.conflict('هذا البريد مسجّل مسبقاً', 'EMAIL_TAKEN');

  const user = users().create({
    name: input.name,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
    role: 'merchant',
  });
  await users().save(user);
  return issue(user);
}

export async function login(input: LoginInput): Promise<IssuedTokens> {
  const user = await users()
    .createQueryBuilder('u')
    .addSelect('u.passwordHash')
    .where('u.email = :email', { email: input.email })
    .getOne();

  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
  }
  return issue(user);
}

export async function refresh(userId: string): Promise<IssuedTokens> {
  const user = await users().findOne({ where: { id: userId } });
  if (!user) throw HttpError.unauthorized('انتهت الجلسة، سجّل الدخول مجدداً');
  return issue(user);
}

export async function me(userId: string): Promise<MeResult> {
  const user = await users().findOne({ where: { id: userId } });
  if (!user) throw HttpError.unauthorized();
  const store = await AppDataSource.getRepository(Store).findOne({
    where: { ownerId: userId },
    relations: { subscription: true },
  });
  return { user: toUserDto(user), store: store ? toStoreDto(store) : null, access: store ? await getStoreAccess(store.id) : null };
}

/** Always resolves the same way, whether or not the email exists. */
export async function forgotPassword(email: string): Promise<void> {
  const user = await users().findOne({ where: { email } });
  if (!user) return;

  const token = randomToken();
  await users().update(user.id, {
    resetToken: sha256(token),
    resetTokenExpiresAt: new Date(Date.now() + RESET_TTL_MS),
  });

  const link = `${env.WEB_PUBLIC_URL}/reset-password?token=${token}`;
  const mail = passwordResetEmail(user.name, link);
  try {
    await sendMail(user.email, mail.subject, mail.html, mail.text);
  } catch (err) {
    console.error('Failed to send reset email:', err instanceof Error ? err.message : err);
  }
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const user = await users().findOne({
    where: { resetToken: sha256(input.token), resetTokenExpiresAt: MoreThan(new Date()) },
  });
  if (!user) throw HttpError.badRequest('رابط إعادة التعيين غير صالح أو منتهي الصلاحية');

  await users().update(user.id, {
    passwordHash: await bcrypt.hash(input.newPassword, BCRYPT_COST),
    resetToken: null,
    resetTokenExpiresAt: null,
  });
}
