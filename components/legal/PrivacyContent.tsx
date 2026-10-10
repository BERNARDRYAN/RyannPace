'use client';

import Link from 'next/link';
import { useLocaleStore } from '@/store/useLocaleStore';
import { SiteHeader } from '@/components/SiteHeader';

const CONTACT = 'ryannpace.app@gmail.com';
const UPDATED = { en: '10 October 2026', zh: '2026年10月10日' };

interface Section {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

const CONTENT: Record<'en' | 'zh', { title: string; intro: string; updated: string; sections: Section[] }> = {
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated',
    intro:
      'RyannPace is a free personal project run by Bernard Ryan Sim in Malaysia. This page explains, in plain language, what data RyannPace handles, why, and what you can do about it.',
    sections: [
      {
        title: 'The short version',
        items: [
          'Your activity files (GPX, FIT, TCX) and background photos are read inside your browser and are never uploaded.',
          'You can design and export posters without an account.',
          'If you sign in, we store your email address, your saved presets and your poster gallery, visible only to you.',
          'No ads, no tracking cookies, and we never sell your data.',
        ],
      },
      {
        title: 'What we collect and why',
        items: [
          'Account: your email address, and if you choose Google sign-in, the name and profile picture Google shares. Used only to sign you in.',
          'Saved presets: the style settings you save (template, palette, format, toggles).',
          'Poster gallery: for each poster you export while signed in, the poster details (title, location text you typed, date, distance, time, pace, elevation, heart rate, calories, splits, gear), a simplified outline of the route (about 600 points), and a small preview image. The outline includes where the run started and finished; the privacy zone only affects what is drawn on posters. Gallery entries are visible only to you.',
          'Technical data: Cloudflare processes IP addresses and request logs to deliver and protect the site. Cloudflare Turnstile checks for bots when you sign in. Cloudflare Web Analytics counts page views without cookies and without identifying you.',
        ],
      },
      {
        title: 'What we never collect',
        items: [
          'Your original activity files or their full-resolution GPS tracks.',
          'Background photos you add to posters.',
          'Exported poster images: these are created in your browser and saved to your own device.',
        ],
      },
      {
        title: 'Service providers',
        paragraphs: ['RyannPace relies on these providers to run. Each processes data only to provide its service:'],
        items: [
          'Supabase: database, sign-in and private file storage.',
          'Cloudflare: hosting, bot protection (Turnstile) and cookie-free analytics.',
          'Brevo: sending sign-in emails.',
          'Google: only if you choose “Continue with Google”.',
        ],
      },
      {
        title: 'Cookies and local storage',
        paragraphs: [
          'We use only what the site needs to work: a secure sign-in session cookie (when you sign in) and your language choice saved in your browser. There are no advertising or tracking cookies.',
        ],
      },
      {
        title: 'Your choices and rights',
        items: [
          'Delete any poster or preset at any time from the app.',
          `To delete your account and all its data, or to ask what data we hold about you, email ${CONTACT} from the address you sign in with. We will act on requests within 30 days.`,
          'You have rights under applicable data protection laws, including Malaysia’s Personal Data Protection Act 2010, such as access to and correction of your personal data.',
        ],
      },
      {
        title: 'How long we keep data',
        paragraphs: [
          'Presets and gallery posters are kept until you delete them or your account. Sign-in links expire shortly after they are sent.',
        ],
      },
      {
        title: 'Security',
        paragraphs: [
          'Data is stored with row-level security so each account can only read its own records, posters are kept in private storage, connections are encrypted, and sign-in sessions use cookies that page scripts cannot read.',
        ],
      },
      {
        title: 'Children',
        paragraphs: ['RyannPace is not intended for children under 13.'],
      },
      {
        title: 'Changes and contact',
        paragraphs: [
          'If this policy changes, the date at the top will change too.',
          `Questions or requests: ${CONTACT}`,
        ],
      },
    ],
  },
  zh: {
    title: '隐私政策',
    updated: '最后更新',
    intro:
      'RyannPace 是由马来西亚的 Bernard Ryan Sim 运营的免费个人项目。本页用通俗的语言说明 RyannPace 会处理哪些数据、为什么处理，以及你可以如何管理这些数据。',
    sections: [
      {
        title: '简要说明',
        items: [
          '你的运动文件（GPX、FIT、TCX）和背景照片只在你的浏览器中读取，绝不会上传。',
          '无需账号即可设计并导出海报。',
          '登录后，我们会保存你的邮箱地址、已存预设和海报作品集，仅你本人可见。',
          '没有广告，没有追踪 Cookie，我们绝不出售你的数据。',
        ],
      },
      {
        title: '我们收集什么，以及原因',
        items: [
          '账号：你的邮箱地址；如果你选择 Google 登录，还包括 Google 提供的姓名和头像。仅用于让你登录。',
          '已存预设：你保存的风格设置（模板、配色、尺寸、开关）。',
          '海报作品集：登录状态下每导出一张海报，会保存海报信息（标题、你输入的地点文字、日期、距离、用时、配速、爬升、心率、热量、分段、装备）、约 600 个点的简化路线轮廓以及一张小预览图。轮廓包含跑步的起点和终点；隐私区域只影响海报上绘制的内容。作品集仅你本人可见。',
          '技术数据：Cloudflare 会处理 IP 地址和请求日志，以提供并保护本网站。登录时由 Cloudflare Turnstile 识别机器人。Cloudflare Web Analytics 统计页面浏览量，不使用 Cookie，也不会识别你的身份。',
        ],
      },
      {
        title: '我们绝不收集',
        items: [
          '你的原始运动文件或完整精度的 GPS 轨迹。',
          '你添加到海报上的背景照片。',
          '导出的海报图片：它们在你的浏览器中生成，并保存到你自己的设备。',
        ],
      },
      {
        title: '服务提供商',
        paragraphs: ['RyannPace 依靠以下服务运行，每家仅为提供其服务而处理数据：'],
        items: [
          'Supabase：数据库、登录和私有文件存储。',
          'Cloudflare：网站托管、机器人防护（Turnstile）和无 Cookie 统计。',
          'Brevo：发送登录邮件。',
          'Google：仅在你选择“使用 Google 继续”时。',
        ],
      },
      {
        title: 'Cookie 与本地存储',
        paragraphs: [
          '我们只使用网站运行所必需的内容：登录时的安全会话 Cookie，以及保存在浏览器中的语言选择。没有广告或追踪 Cookie。',
        ],
      },
      {
        title: '你的选择与权利',
        items: [
          '你可以随时在应用中删除任何海报或预设。',
          `如需删除账号及其全部数据，或查询我们持有的关于你的数据，请用你登录的邮箱发送邮件至 ${CONTACT}。我们会在 30 天内处理。`,
          '你享有适用数据保护法律赋予的权利，包括马来西亚《2010 年个人数据保护法》（PDPA），例如查阅和更正你的个人数据。',
        ],
      },
      {
        title: '数据保留期限',
        paragraphs: ['预设和作品集海报会保留到你删除它们或删除账号为止。登录链接在发送后不久即失效。'],
      },
      {
        title: '安全',
        paragraphs: [
          '数据存储启用了行级安全，每个账号只能读取自己的记录；海报存放在私有存储中；连接全程加密；登录会话使用页面脚本无法读取的 Cookie。',
        ],
      },
      {
        title: '儿童',
        paragraphs: ['RyannPace 不面向 13 岁以下儿童。'],
      },
      {
        title: '变更与联系方式',
        paragraphs: ['如本政策有变更，页首的日期也会随之更新。', `问题或请求：${CONTACT}`],
      },
    ],
  },
};

export function PrivacyContent() {
  const locale = useLocaleStore((s) => s.locale);
  const c = CONTENT[locale];

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pt-12 pb-24 sm:px-6">
        <p className="font-mono text-[11px] tracking-[0.24em] text-muted uppercase">
          {c.updated}: {UPDATED[locale]}
        </p>
        <h1 className="mt-2 font-serif text-5xl text-ink">{c.title}</h1>
        <p className="mt-5 text-ink-soft">{c.intro}</p>

        {c.sections.map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p} className="mt-3 text-sm leading-relaxed text-ink-soft">
                {p}
              </p>
            ))}
            {section.items && (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <div className="mt-14 border-t border-line pt-6 text-sm">
          <Link href="/" className="text-ink underline underline-offset-2">
            ← RyannPace
          </Link>
        </div>
      </main>
    </div>
  );
}
