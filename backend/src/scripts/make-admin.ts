// Grants (or revokes) platform-admin rights.
// Usage:  npm run make-admin -- you@example.com                      (existing account)
//         npm run make-admin -- you@example.com --create --password "secret" [--name "الاسم"]
//         npm run make-admin -- you@example.com --password "new-secret"      (existing account: also resets password)
//         npm run make-admin -- you@example.com --revoke
import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { emailSchema } from '@matjari/shared';
import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User';

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes('--revoke');
  const create = args.includes('--create');
  const password = flag(args, '--password');
  const name = flag(args, '--name') ?? 'مدير المنصة';
  const valueFlags = new Set([password, flag(args, '--name')]);
  const rawEmail = args.find((a) => !a.startsWith('--') && !valueFlags.has(a));

  const parsed = emailSchema.safeParse(rawEmail ?? '');
  if (!parsed.success) {
    console.error('❌ اكتب البريد الإلكتروني:  npm run make-admin -- you@example.com');
    process.exit(1);
  }
  if (create && (!password || password.length < 6)) {
    console.error('❌ مع --create اكتب كلمة مرور من 6 أحرف على الأقل:  --password "..."');
    process.exit(1);
  }

  await AppDataSource.initialize();
  try {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { email: parsed.data } });

    if (!user && create) {
      await repo.save(repo.create({ name, email: parsed.data, passwordHash: await bcrypt.hash(password!, 12), role: 'admin' }));
      console.log(`✅ تم إنشاء حساب المدير ${parsed.data}. سجّل الدخول وستفتح لوحة المدير /admin`);
      if (password!.length < 8) console.warn('⚠️  كلمة المرور قصيرة — مناسبة للتجربة المحلية فقط، غيّرها قبل النشر.');
      return;
    }
    if (!user) {
      console.error(`❌ لا يوجد حساب بالبريد ${parsed.data}. أنشئه من صفحة التسجيل، أو أضف --create --password "..."`);
      process.exitCode = 1;
      return;
    }

    if (password && password.length < 6) {
      console.error('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      process.exitCode = 1;
      return;
    }
    const role = revoke ? 'merchant' : 'admin';
    await repo.update(user.id, { role, ...(password && !revoke ? { passwordHash: await bcrypt.hash(password, 12) } : {}) });
    console.log(revoke ? `✅ تم سحب صلاحية المدير من ${user.email}` : `✅ أصبح ${user.email} مديراً للمنصة. سجّل الدخول وافتح /admin`);
    if (password && !revoke) console.log('✅ تم تغيير كلمة المرور.');
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
